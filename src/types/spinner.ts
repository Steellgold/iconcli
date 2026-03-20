export type SpinnerAnimationLib =
  | "css"
  | "tailwind"
  | "framer-motion"
  | "react-native-animated"
  | "react-native-reanimated";

export interface SpinnerTemplateOptions {
  componentName: string;
  svgContent: string;
  viewBox: string;
  typescript: boolean;
  animationLib: SpinnerAnimationLib;
  defaultDuration: number;
  lineWidth?: number;
  jsxQuotes?: "single" | "double";
  bracketSameLine?: boolean;
}
