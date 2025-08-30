declare module 'react-native-vector-icons/MaterialIcons' {
  import * as React from 'react';
  import { TextProps } from 'react-native';

  export interface IconProps extends TextProps {
    name: string;
    size?: number;
    color?: string;
  }

  export default class MaterialIcons extends React.Component<IconProps> {}
}
