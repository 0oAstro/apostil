import { get, set } from "idb-keyval";
import { newId } from "./store";

export const IMAGE_SCHEME = "apostil-image:";
const IMAGE_LINK = /!\[[^\]]*\]\(apostil-image:([\w-]+)\)/g;

export async function saveImage(file: File): Promise<string> {
  const id = newId();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
  await set(`image:${id}`, dataUrl);
  return id;
}

export const loadImage = (id: string) => get<string>(`image:${id}`);

export async function latestImages(text: string, limit = 3): Promise<{ dataUrl: string }[]> {
  const ids = [...text.matchAll(IMAGE_LINK)].map((match) => match[1]!).slice(-limit);
  const images: { dataUrl: string }[] = [];
  for (const id of ids) {
    const dataUrl = await loadImage(id);
    if (dataUrl) images.push({ dataUrl });
  }
  return images;
}
