# React Navigation ReModal

![Recording](recording.gif)

# Getting Started

**Requirements**

```
react-native-reanimated
```

1. Installation

```
npm install react-native-remodal
```

2. Wrap your root component with the `ReModalProvider`

```tsx
<ReModalProvider>...</ReModalProvider>
```

3. Use it!

```tsx
<ReModal isVisible={open} onCancel={() => setOpen(false)}>
    ...
</ReModal>
```

# Props

## `<ReModal/>`

-   `children`: React.ReactElement;
-   `isVisible`: boolean;
-   `onCancel`?: () => void;
-   `autoCloseWhenOpeningNextDialog`?: boolean;
-   `modalAnimationFunction`?: (gestureState: Animated.Adaptable<number>, opacity: Animated.Adaptable<number>, modalLayout?: {
          width: Animated.Adaptable<number>;
          height: Animated.Adaptable<number>;
    })=> any;
-   `onModalShow`?: () => void;
-   `onModalHide`?: () => void;
-   `containerStyle`?: ViewStyle;

# Full Example

```tsx
import React, { useState } from 'react';
import { Button, Dimensions, Text, View } from 'react-native';
import { ReModel } from 'react-native-remodal';

export default function ModalTest(props) {
    const [open1, setOpen1] = useState(false);
    const [open2, setOpen2] = useState(false);

    return (
        <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
            <ReModel isVisible={open1} onCancel={() => setOpen1(false)}>
                <View style={{ width: Dimensions.get('window').width * 0.8, backgroundColor: '#fff', padding: 32 }}>
                    <Text>This is a test!</Text>
                    <Button onPress={() => setOpen2(true)} title="Show Modal #2" />
                </View>
            </ReModel>
            <ReModel isVisible={open2} onCancel={() => setOpen2(false)}>
                <View style={{ width: Dimensions.get('window').width * 0.8, backgroundColor: '#fff', padding: 32 }}>
                    <Text>This is another modal!</Text>
                </View>
            </ReModel>
            <Button onPress={() => setOpen1(true)} title="Show Modal #1" />
            <Button onPress={() => setOpen2(true)} title="Show Modal #2" />
        </View>
    );
}
```
