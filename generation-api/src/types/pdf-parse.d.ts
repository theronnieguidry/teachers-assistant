declare module "pdf-parse" {
  interface PageTextResult {
    num: number;
    text: string;
  }

  interface TextResult {
    pages: Array<PageTextResult>;
    text: string;
    total: number;
    getPageText(num: number): string;
  }

  interface LoadParameters {
    url?: string | URL;
    data?: string | number[] | ArrayBuffer | Uint8Array | Buffer;
    password?: string;
    verbosity?: number;
  }

  interface ParseParameters {
    first?: number;
    last?: number;
    partial?: number[];
  }

  class PDFParse {
    constructor(options: LoadParameters);
    destroy(): Promise<void>;
    getText(params?: ParseParameters): Promise<TextResult>;
  }

  export { PDFParse, TextResult, PageTextResult, LoadParameters, ParseParameters };
}
