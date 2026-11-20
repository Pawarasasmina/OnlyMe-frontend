import { useSurfaceTurn } from "./useSurfaceTurn";

// Only turn between people; their individual slides change without a cube.
export function useStoryPersonTransition(isOpen, ownerKey, storyKey) {
  return useSurfaceTurn(isOpen, ownerKey, storyKey, "cube");
}
