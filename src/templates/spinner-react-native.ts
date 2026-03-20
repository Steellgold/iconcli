import {
  convertSvgToReactNativeJsx,
  extractInnerSvg,
  getUsedReactNativeSvgImports,
} from "@/templates/react-native";
import { formatFunctionSignature, formatImportStatement, formatJsxOpenTag } from "@/adapters/code-helpers";
import type { SpinnerTemplateOptions } from "@/types/spinner";

export const generateReactNativeSpinnerComponent = (options: SpinnerTemplateOptions): string => {
  const {
    componentName,
    svgContent,
    viewBox,
    typescript,
    animationLib,
    defaultDuration,
    lineWidth = 100,
    bracketSameLine = false,
  } = options;

  const svgInner = extractInnerSvg(svgContent);
  const rnJsxInner = convertSvgToReactNativeJsx(svgInner);
  const extraImports = getUsedReactNativeSvgImports(rnJsxInner);
  const svgImports = ["Svg", ...extraImports];

  const typeImport = typescript ? `import type { SvgProps } from "react-native-svg";\n` : "";
  const svgImportLine = `${formatImportStatement(svgImports, "react-native-svg", lineWidth, '"')}\n`;

  const propsType = typescript
    ? `export interface ${componentName}Props extends SvgProps {
  size?: number | string;
  color?: string;
  duration?: number;
}

`
    : "";

  const propsParams = [
    "size = 24",
    'color = "currentColor"',
    `duration = ${defaultDuration}`,
    "...props",
  ];
  const propsPrefix = `export const ${componentName} = `;
  const propsSignature = formatFunctionSignature(
    propsPrefix,
    propsParams,
    typescript ? `${componentName}Props` : undefined,
    lineWidth
  );

  const svgAttrs = [
    "{...(size && { width: size, height: size })}",
    `viewBox="${viewBox}"`,
    'fill="none"',
    "{...(color && { stroke: color })}",
    "{...props}",
  ];
  // <Svg> is placed after "      " (6 spaces) in the template
  const svgOpenTag = formatJsxOpenTag("Svg", svgAttrs, "      ", lineWidth, bracketSameLine);

  const svgElement = `${svgOpenTag}
        ${rnJsxInner}
      </Svg>`;

  if (animationLib === "react-native-reanimated") {
    const reanimatedImport = `import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
`;
    const useEffectImport = `import { useEffect } from "react";\n`;

    return `${typeImport}${useEffectImport}${reanimatedImport}${svgImportLine}
${propsType}export const ${componentName} = ${propsSignature} => {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration, easing: Easing.linear }),
      -1,
      false
    );
  }, [duration]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: \`\${rotation.value}deg\` }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      ${svgElement}
    </Animated.View>
  );
};
`;
  }

  // react-native-animated (default)
  const rnImport = `import { useRef, useEffect } from "react";\n`;
  const animatedImport = `import { Animated, Easing } from "react-native";\n`;

  return `${typeImport}${rnImport}${animatedImport}${svgImportLine}
${propsType}export const ${componentName} = ${propsSignature} => {
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [duration]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Animated.View style={{ transform: [{ rotate: spin }] }}>
      ${svgElement}
    </Animated.View>
  );
};
`;
};
