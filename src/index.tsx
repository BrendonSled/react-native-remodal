import cuid from 'cuid';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { BackHandler, KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet, TouchableWithoutFeedback, ViewStyle } from 'react-native';
import Animated, { Easing } from 'react-native-reanimated';

interface IReModalContext {
    setView: (key: string, view: React.ReactElement<any> | undefined) => void;
    setConfig: (key: string, config: any) => void;
    setVisible: (key: string, visible: boolean) => void;
}

const ReModalContext = React.createContext<IReModalContext>({} as any);

const { Value, block, timing, cond, stopClock, and, eq, neq, set, startClock, Clock, interpolate, Extrapolate, call } = Animated;

export enum State {
    BEGAN,
    END,
}

const runOpacityTimer = (
    gestureState: Animated.Adaptable<number>,
    modalLayout: IModalLayout,
    onModalShow?: () => void,
    onModalHide?: () => void,
    onShowConfig = {
        duration: Platform.OS === 'ios' ? 300 : 240,
        easing: Easing.inOut(Easing.ease),
    },
    onHideConfig = {
        duration: Platform.OS === 'ios' ? 300 : 240,
        easing: Easing.inOut(Easing.ease),
    },
) => {
    const clock = new Clock();
    const state = {
        finished: new Value(0),
        position: new Value(0),
        time: new Value(0),
        frameTime: new Value(0),
    };

    const toValue = new Value(-1);

    return cond(
        neq(modalLayout.height, -1),
        block([
            cond(and(eq(gestureState, State.BEGAN), neq(toValue, 1)), [
                set(state.finished, 0),
                set(state.time, 0),
                set(state.frameTime, 0),
                set(toValue, 1),
                startClock(clock),
            ]),
            cond(and(eq(gestureState, State.END), neq(toValue, 0)), [
                set(state.finished, 0),
                set(state.time, 0),
                set(state.frameTime, 0),
                set(toValue, 0),
                startClock(clock),
            ]),
            cond(
                eq(gestureState, State.BEGAN),
                timing(clock, state, { ...onShowConfig, toValue: toValue }),
                timing(clock, state, { ...onHideConfig, toValue: toValue }),
            ),
            cond(state.finished, stopClock(clock)),
            onModalShow ? cond(and(state.finished, eq(gestureState, State.BEGAN)), call([], onModalShow)) : 0,
            onModalHide ? cond(and(state.finished, eq(gestureState, State.END)), call([], onModalHide)) : 0,
            interpolate(state.position, {
                inputRange: [0, 1],
                outputRange: [0, 1],
                extrapolate: Extrapolate.CLAMP,
            }),
        ]),
        0,
    );
};

function defaultModalAnimationStyle(gestureState: Animated.Adaptable<number>, opacity: Animated.Adaptable<number>) {
    const opacityIn = cond(
        eq(gestureState, State.BEGAN),
        interpolate(opacity, {
            inputRange: Platform.OS === 'ios' ? [0, 0.2, 1] : [0, 1],
            outputRange: Platform.OS === 'ios' ? [0, 1, 1] : [0, 1],
            extrapolate: Extrapolate.CLAMP,
        }),
        opacity,
    );

    const scaleIn = cond(
        eq(gestureState, State.BEGAN),
        interpolate(opacity, {
            inputRange: [0, 1],
            outputRange: [Platform.OS === 'android' ? 0.8 : 1.2, 1],
            extrapolate: Extrapolate.CLAMP,
        }),
        1,
    );

    return { opacity: opacityIn, transform: [{ scale: scaleIn }] };
}

interface IConfigs {
    duration: number;
    easing: Animated.EasingFunction;
}

interface IModalLayout {
    width: Animated.Value<number>;
    height: Animated.Value<number>;
}

function Modal({
    children,
    onCancel,
    isVisible,
    viewStyleFnc,
    onModalShow,
    onModalHide,
    containerStyle,
    keyboardAvoiding = true,
    keyboardVerticalOffset,
    onShowConfig,
    onHideConfig,
    unmountWhenNotVisible,
}: {
    children: any;
    onCancel?: () => void;
    isVisible: boolean;
    viewStyleFnc: Required<IReModalProps>['modalAnimationFunction'];
    onModalShow?: () => void;
    onModalHide?: () => void;
    containerStyle?: ViewStyle;
    keyboardAvoiding?: boolean;
    keyboardVerticalOffset?: number;
    onShowConfig?: IConfigs;
    onHideConfig?: IConfigs;
    unmountWhenNotVisible?: boolean;
}) {
    const modalLayout = useRef({ width: new Value<number>(-1), height: new Value<number>(-1) });
    const { current: animationState } = useRef(new Value<number>(-1));
    const { current: opacity } = useRef(
        runOpacityTimer(
            animationState,
            modalLayout.current,
            onModalShow,
            () => {
                if (onModalHide) {
                    onModalHide();
                }
                setIsAnimVisible(false);
            },
            onShowConfig,
            onHideConfig,
        ),
    );
    const { current: viewStyle } = useRef(viewStyleFnc(animationState, opacity as Animated.Adaptable<number>, modalLayout.current));
    const init = useRef(false);
    const [isAnimVisible, setIsAnimVisible] = useState(isVisible);

    useEffect(() => {
        if (init.current) {
            if (isVisible) {
                setIsAnimVisible(true);
            }
            animationState.setValue(isVisible ? State.BEGAN : State.END);
        }
        init.current = true;
    }, [isVisible]);

    return (
        <KeyboardAvoidingView
            behavior="height"
            enabled={keyboardAvoiding}
            keyboardVerticalOffset={keyboardVerticalOffset}
            style={[styles.container, containerStyle]}
            pointerEvents={isVisible ? 'auto' : 'none'}
        >
            <TouchableWithoutFeedback onPress={onCancel}>
                <Animated.View style={[styles.backdrop, { opacity }]} />
            </TouchableWithoutFeedback>
            {(!unmountWhenNotVisible || isAnimVisible) && (
                <SafeAreaView>
                    <Animated.View
                        onLayout={({
                            nativeEvent: {
                                layout: { height, width },
                            },
                        }) => {
                            modalLayout.current.height.setValue(height);
                            modalLayout.current.width.setValue(width);
                        }}
                        style={viewStyle}
                    >
                        {children}
                    </Animated.View>
                </SafeAreaView>
            )}
        </KeyboardAvoidingView>
    );
}

export function ReModalProvider({ children }: { children: React.ReactNode }) {
    const [views, setViews] = useState<{ [key: string]: React.ReactElement<any> | undefined }>({});
    const visibleView = useRef<{ [key: string]: boolean }>({});
    const configs = useRef<{ [key: string]: Partial<IReModalProps> }>({});

    const [currentView] = Object.entries(visibleView.current).find(([_, v]) => v) || [];
    const selectedView = (key: string | undefined) => (key && configs.current[key]) || {};

    useEffect(() => {
        function f() {
            const view = selectedView(currentView);
            if (view.onCancel) {
                view.onCancel();
                return true;
            }
            return false;
        }
        BackHandler.addEventListener('hardwareBackPress', f);
        return () => BackHandler.removeEventListener('hardwareBackPress', f);
    });

    return (
        <ReModalContext.Provider
            value={{
                setView: (key, view) => {
                    setViews((views) => ({ ...views, [key]: view }));
                },
                setConfig: (key, config) => {
                    configs.current = { ...configs.current, [key]: config };
                },
                setVisible: (key, visible) => {
                    if (visible) {
                        const view = selectedView(currentView);
                        if (view.onCancel && view.autoCloseWhenOpeningNextDialog) {
                            view.onCancel();
                        }
                    }
                    visibleView.current = { ...visibleView.current, [key]: visible };
                },
            }}
        >
            {children}
            {Object.entries(views).map(([key, view]) => {
                const { modalAnimationFunction, ...props } = selectedView(key);
                return (
                    <Modal
                        {...props}
                        children={view}
                        isVisible={visibleView.current[key]}
                        key={key}
                        viewStyleFnc={modalAnimationFunction || defaultModalAnimationStyle}
                    />
                );
            })}
        </ReModalContext.Provider>
    );
}

interface IReModalProps {
    children: React.ReactElement;
    isVisible: boolean;
    onCancel?: () => void;
    autoCloseWhenOpeningNextDialog?: boolean;
    modalAnimationFunction?: (
        gestureState: Animated.Adaptable<number>,
        opacity: Animated.Adaptable<number>,
        modalLayout?: { width: Animated.Adaptable<number>; height: Animated.Adaptable<number> },
    ) => any;
    onModalShow?: () => void;
    onModalHide?: () => void;
    containerStyle?: ViewStyle;
    keyboardAvoiding?: boolean;
    keyboardVerticalOffset?: number;
    onShowConfig?: IConfigs;
    onHideConfig?: IConfigs;
    unmountWhenNotVisible?: boolean;
}

export function ReModal({
    children,
    isVisible,
    autoCloseWhenOpeningNextDialog = false,
    modalAnimationFunction = defaultModalAnimationStyle,
    unmountWhenNotVisible = true,
    ...rest
}: IReModalProps): null {
    const { setView, setVisible, setConfig } = useContext(ReModalContext);
    const { current: id } = useRef(cuid());

    if (!setView) {
        throw new Error(
            '<ReModal/> is placed outside of a <ReModalProvider/>. Make sure <ReModalProvider/> is wrapping your root component.',
        );
    }

    useEffect(() => {
        setVisible(id, isVisible);
        return () => setVisible(id, false);
    }, [isVisible]);

    useEffect(() => {
        setConfig(id, { autoCloseWhenOpeningNextDialog, modalAnimationFunction, unmountWhenNotVisible, ...rest });
    }, [rest, autoCloseWhenOpeningNextDialog, modalAnimationFunction]);

    useEffect(() => {
        const element = React.cloneElement(children);
        setView(id, element);
        return () => setView(id, undefined);
    }, [children]);

    return null;
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 99,
        elevation: 7,
        alignItems: 'center',
        justifyContent: 'center',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#00000050',
    },
});
