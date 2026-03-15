export interface IconMetadata {
  name: string;
  tags: string[];
}

export interface IconLibrary {
  name: string;
  displayName: string;
  license: string;
  licenseUrl: string;
  website: string;
  copyright: string;
}

export interface FetchIconResult {
  svgContent: string;
  metadata: {
    library: IconLibrary;
    iconName: string;
  };
}
