declare module "formidable" {
  interface Options {
    maxFileSize?: number;
    maxFiles?: number;
    multiples?: boolean;
    keepExtensions?: boolean;
  }
  interface UploadedFile {
    filepath: string;
    originalFilename: string | null;
    mimetype: string | null;
    size: number;
    newFilename: string;
  }
  interface Formidable {
    parse(req: any): Promise<[Record<string, string | string[] | undefined>, Record<string, UploadedFile[] | undefined>]>;
  }
  function formidable(options?: Options): Formidable;
  export { formidable };
  export default formidable;
}
