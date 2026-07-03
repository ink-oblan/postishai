export interface MediaFile {
  id: string;
  name: string;
  file: File;
  previewUrl: string;
  width: number;
  height: number;
  willCrop: boolean;
}
