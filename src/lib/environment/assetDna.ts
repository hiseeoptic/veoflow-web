export interface AssetDNA {
  asset_id: string;
  entity_definition: string;
  texture_dna: string;
}

export const assetDnas: Record<string, AssetDNA> = {
  "table_01": { asset_id: "table_01", entity_definition: "wooden table", texture_dna: "oak_grain" },
  "chair_01": { asset_id: "chair_01", entity_definition: "metal chair", texture_dna: "brushed_steel" }
};
