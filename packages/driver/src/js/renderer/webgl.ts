import { Format } from "dds/src/format.ts";

export type FormatDesc = {
  internal: GLenum;
  external: GLenum;
  type: GLenum;
  properties: number;
};

export function glFormatFor(format: Format): FormatDesc {
  const desc = formatDescTable[format];
  if (!desc) throw new Error(`Unsupported format: ${format}`);
  return desc;
}

const GL = WebGLRenderingContext;

// biome-ignore format: compact
const formatDescTable: Record<number, FormatDesc> = {
  [Format.RGBA8_UNORM_PACK8]: { internal: GL.RGBA8, external: GL.RGBA, type: GL.UNSIGNED_BYTE, properties: 0 },
  [Format.RGBA_DXT1_UNORM_BLOCK8]: { internal: 0x83F1/*COMPRESSED_RGBA_S3TC_DXT1_EXT*/, external: 0, type: 0, properties: 0 },
  [Format.RGBA_BP_UNORM_BLOCK16]: { internal: 0x8E8C/*EXT_texture_compression_bptc*/, external: 0, type: 0, properties: 0 },
  [Format.L8_UNORM_PACK8]: { internal: 0x8040, external: GL.LUMINANCE, type: GL.UNSIGNED_BYTE, properties: 0 },
    // [Format.UNDEFINED]: ,
    //
    // [Format.RG4_UNORM_PACK8]: { internal: GL., external: GL., type: GL., properties: 0 },
    // [Format.RGBA4_UNORM_PACK16]: { internal: GL., external: GL., type: GL., properties: 0 },
    // [Format.BGRA4_UNORM_PACK16]: { internal: GL., external: GL., type: GL., properties: 0 },
    // [Format.R5G6B5_UNORM_PACK16]: { internal: GL., external: GL., type: GL., properties: 0 },
    // [Format.B5G6R5_UNORM_PACK16]: { internal: GL., external: GL., type: GL., properties: 0 },
    // [Format.RGB5A1_UNORM_PACK16]: { internal: GL., external: GL., type: GL., properties: 0 },
    // [Format.BGR5A1_UNORM_PACK16]: { internal: GL., external: GL., type: GL., properties: 0 },
    // [Format.A1RGB5_UNORM_PACK16]: { internal: GL., external: GL., type: GL., properties: 0 },
    //
    // [Format.R8_UNORM_PACK8]: { internal: GL., external: GL., type: GL., properties: 0 },
    // [Format.R8_SNORM_PACK8]:
    // [Format.R8_USCALED_PACK8]:
    // [Format.R8_SSCALED_PACK8]:
    // [Format.R8_UINT_PACK8]:
    // [Format.R8_SINT_PACK8]:
    // [Format.R8_SRGB_PACK8]:
    //
    // [Format.RG8_UNORM_PACK8]:
    // [Format.RG8_SNORM_PACK8]:
    // [Format.RG8_USCALED_PACK8]:
    // [Format.RG8_SSCALED_PACK8]:
    // [Format.RG8_UINT_PACK8]:
    // [Format.RG8_SINT_PACK8]:
    // [Format.RG8_SRGB_PACK8]:
    //
    // [Format.RGB8_UNORM_PACK8]:
    // [Format.RGB8_SNORM_PACK8]:
    // [Format.RGB8_USCALED_PACK8]:
    // [Format.RGB8_SSCALED_PACK8]:
    // [Format.RGB8_UINT_PACK8]:
    // [Format.RGB8_SINT_PACK8]:
    // [Format.RGB8_SRGB_PACK8]:
    //
    // [Format.BGR8_UNORM_PACK8]:
    // [Format.BGR8_SNORM_PACK8]:
    // [Format.BGR8_USCALED_PACK8]:
    // [Format.BGR8_SSCALED_PACK8]:
    // [Format.BGR8_UINT_PACK8]:
    // [Format.BGR8_SINT_PACK8]:
    // [Format.BGR8_SRGB_PACK8]:
    //
    // [Format.RGBA8_UNORM_PACK8]:
    // [Format.RGBA8_SNORM_PACK8]:
    // [Format.RGBA8_USCALED_PACK8]:
    // [Format.RGBA8_SSCALED_PACK8]:
    // [Format.RGBA8_UINT_PACK8]:
    // [Format.RGBA8_SINT_PACK8]:
    // [Format.RGBA8_SRGB_PACK8]:
    //
    // [Format.BGRA8_UNORM_PACK8]:
    // [Format.BGRA8_SNORM_PACK8]:
    // [Format.BGRA8_USCALED_PACK8]:
    // [Format.BGRA8_SSCALED_PACK8]:
    // [Format.BGRA8_UINT_PACK8]:
    // [Format.BGRA8_SINT_PACK8]:
    // [Format.BGRA8_SRGB_PACK8]:
    //
    // [Format.RGBA8_UNORM_PACK32]:
    // [Format.RGBA8_SNORM_PACK32]:
    // [Format.RGBA8_USCALED_PACK32]:
    // [Format.RGBA8_SSCALED_PACK32]:
    // [Format.RGBA8_UINT_PACK32]:
    // [Format.RGBA8_SINT_PACK32]:
    // [Format.RGBA8_SRGB_PACK32]:
    //
    // [Format.RGB10A2_UNORM_PACK32]:
    // [Format.RGB10A2_SNORM_PACK32]:
    // [Format.RGB10A2_USCALED_PACK32]:
    // [Format.RGB10A2_SSCALED_PACK32]:
    // [Format.RGB10A2_UINT_PACK32]:
    // [Format.RGB10A2_SINT_PACK32]:
    //
    // [Format.BGR10A2_UNORM_PACK32]:
    // [Format.BGR10A2_SNORM_PACK32]:
    // [Format.BGR10A2_USCALED_PACK32]:
    // [Format.BGR10A2_SSCALED_PACK32]:
    // [Format.BGR10A2_UINT_PACK32]:
    // [Format.BGR10A2_SINT_PACK32]:
    //
    // [Format.R16_UNORM_PACK16]:
    // [Format.R16_SNORM_PACK16]:
    // [Format.R16_USCALED_PACK16]:
    // [Format.R16_SSCALED_PACK16]:
    // [Format.R16_UINT_PACK16]:
    // [Format.R16_SINT_PACK16]:
    // [Format.R16_SFLOAT_PACK16]:
    //
    // [Format.RG16_UNORM_PACK16]:
    // [Format.RG16_SNORM_PACK16]:
    // [Format.RG16_USCALED_PACK16]:
    // [Format.RG16_SSCALED_PACK16]:
    // [Format.RG16_UINT_PACK16]:
    // [Format.RG16_SINT_PACK16]:
    // [Format.RG16_SFLOAT_PACK16]:
    //
    // [Format.RGB16_UNORM_PACK16]:
    // [Format.RGB16_SNORM_PACK16]:
    // [Format.RGB16_USCALED_PACK16]:
    // [Format.RGB16_SSCALED_PACK16]:
    // [Format.RGB16_UINT_PACK16]:
    // [Format.RGB16_SINT_PACK16]:
    // [Format.RGB16_SFLOAT_PACK16]:
    //
    // [Format.RGBA16_UNORM_PACK16]:
    // [Format.RGBA16_SNORM_PACK16]:
    // [Format.RGBA16_USCALED_PACK16]:
    // [Format.RGBA16_SSCALED_PACK16]:
    // [Format.RGBA16_UINT_PACK16]:
    // [Format.RGBA16_SINT_PACK16]:
    // [Format.RGBA16_SFLOAT_PACK16]:
    //
    // [Format.R32_UINT_PACK32]:
    // [Format.R32_SINT_PACK32]:
    // [Format.R32_SFLOAT_PACK32]:
    //
    // [Format.RG32_UINT_PACK32]:
    // [Format.RG32_SINT_PACK32]:
    // [Format.RG32_SFLOAT_PACK32]:
    //
    // [Format.RGB32_UINT_PACK32]:
    // [Format.RGB32_SINT_PACK32]:
    // [Format.RGB32_SFLOAT_PACK32]:
    //
    // [Format.RGBA32_UINT_PACK32]:
    // [Format.RGBA32_SINT_PACK32]:
    // [Format.RGBA32_SFLOAT_PACK32]:
    //
    // [Format.R64_UINT_PACK64]:
    // [Format.R64_SINT_PACK64]:
    // [Format.R64_SFLOAT_PACK64]:
    //
    // [Format.RG64_UINT_PACK64]:
    // [Format.RG64_SINT_PACK64]:
    // [Format.RG64_SFLOAT_PACK64]:
    //
    // [Format.RGB64_UINT_PACK64]:
    // [Format.RGB64_SINT_PACK64]:
    // [Format.RGB64_SFLOAT_PACK64]:
    //
    // [Format.RGBA64_UINT_PACK64]:
    // [Format.RGBA64_SINT_PACK64]:
    // [Format.RGBA64_SFLOAT_PACK64]:
    //
    // [Format.RG11B10_UFLOAT_PACK32]:
    // [Format.RGB9E5_UFLOAT_PACK32]:
    //
    // [Format.D16_UNORM_PACK16]:
    // [Format.D24_UNORM_PACK32]:
    // [Format.D32_SFLOAT_PACK32]:
    // [Format.S8_UINT_PACK8]:
    // [Format.D16_UNORM_S8_UINT_PACK32]:
    // [Format.D24_UNORM_S8_UINT_PACK32]:
    // [Format.D32_SFLOAT_S8_UINT_PACK64]:
    //
    // [Format.RGB_DXT1_UNORM_BLOCK8]:
    // [Format.RGB_DXT1_SRGB_BLOCK8]:
    // [Format.RGBA_DXT1_UNORM_BLOCK8]:
    // [Format.RGBA_DXT1_SRGB_BLOCK8]:
    // [Format.RGBA_DXT3_UNORM_BLOCK16]:
    // [Format.RGBA_DXT3_SRGB_BLOCK16]:
    // [Format.RGBA_DXT5_UNORM_BLOCK16]:
    // [Format.RGBA_DXT5_SRGB_BLOCK16]:
    // [Format.R_ATI1N_UNORM_BLOCK8]:
    // [Format.R_ATI1N_SNORM_BLOCK8]:
    // [Format.RG_ATI2N_UNORM_BLOCK16]:
    // [Format.RG_ATI2N_SNORM_BLOCK16]:
    //
    // [Format.RGB_BP_UFLOAT_BLOCK16]:
    // [Format.RGB_BP_SFLOAT_BLOCK16]:
    // [Format.RGBA_BP_UNORM_BLOCK16]:
    // [Format.RGBA_BP_SRGB_BLOCK16]:
    //
    // [Format.RGB_ETC2_UNORM_BLOCK8]:
    // [Format.RGB_ETC2_SRGB_BLOCK8]:
    // [Format.RGBA_ETC2_UNORM_BLOCK8]:
    // [Format.RGBA_ETC2_SRGB_BLOCK8]:
    // [Format.RGBA_ETC2_UNORM_BLOCK16]:
    // [Format.RGBA_ETC2_SRGB_BLOCK16]:
    // [Format.R_EAC_UNORM_BLOCK8]:
    // [Format.R_EAC_SNORM_BLOCK8]:
    // [Format.RG_EAC_UNORM_BLOCK16]:
    // [Format.RG_EAC_SNORM_BLOCK16]:
    //
    // [Format.RGBA_ASTC_4X4_UNORM_BLOCK16]:
    // [Format.RGBA_ASTC_4X4_SRGB_BLOCK16]:
    // [Format.RGBA_ASTC_5X4_UNORM_BLOCK16]:
    // [Format.RGBA_ASTC_5X4_SRGB_BLOCK16]:
    // [Format.RGBA_ASTC_5X5_UNORM_BLOCK16]:
    // [Format.RGBA_ASTC_5X5_SRGB_BLOCK16]:
    // [Format.RGBA_ASTC_6X5_UNORM_BLOCK16]:
    // [Format.RGBA_ASTC_6X5_SRGB_BLOCK16]:
    // [Format.RGBA_ASTC_6X6_UNORM_BLOCK16]:
    // [Format.RGBA_ASTC_6X6_SRGB_BLOCK16]:
    // [Format.RGBA_ASTC_8X5_UNORM_BLOCK16]:
    // [Format.RGBA_ASTC_8X5_SRGB_BLOCK16]:
    // [Format.RGBA_ASTC_8X6_UNORM_BLOCK16]:
    // [Format.RGBA_ASTC_8X6_SRGB_BLOCK16]:
    // [Format.RGBA_ASTC_8X8_UNORM_BLOCK16]:
    // [Format.RGBA_ASTC_8X8_SRGB_BLOCK16]:
    // [Format.RGBA_ASTC_10X5_UNORM_BLOCK16]:
    // [Format.RGBA_ASTC_10X5_SRGB_BLOCK16]:
    // [Format.RGBA_ASTC_10X6_UNORM_BLOCK16]:
    // [Format.RGBA_ASTC_10X6_SRGB_BLOCK16]:
    // [Format.RGBA_ASTC_10X8_UNORM_BLOCK16]:
    // [Format.RGBA_ASTC_10X8_SRGB_BLOCK16]:
    // [Format.RGBA_ASTC_10X10_UNORM_BLOCK16]:
    // [Format.RGBA_ASTC_10X10_SRGB_BLOCK16]:
    // [Format.RGBA_ASTC_12X10_UNORM_BLOCK16]:
    // [Format.RGBA_ASTC_12X10_SRGB_BLOCK16]:
    // [Format.RGBA_ASTC_12X12_UNORM_BLOCK16]:
    // [Format.RGBA_ASTC_12X12_SRGB_BLOCK16]:
    //
    // [Format.RGB_PVRTC1_8X8_UNORM_BLOCK32]:
    // [Format.RGB_PVRTC1_8X8_SRGB_BLOCK32]:
    // [Format.RGB_PVRTC1_16X8_UNORM_BLOCK32]:
    // [Format.RGB_PVRTC1_16X8_SRGB_BLOCK32]:
    // [Format.RGBA_PVRTC1_8X8_UNORM_BLOCK32]:
    // [Format.RGBA_PVRTC1_8X8_SRGB_BLOCK32]:
    // [Format.RGBA_PVRTC1_16X8_UNORM_BLOCK32]:
    // [Format.RGBA_PVRTC1_16X8_SRGB_BLOCK32]:
    //
    // [Format.RGBA_PVRTC2_4X4_UNORM_BLOCK8]:
    // [Format.RGBA_PVRTC2_4X4_SRGB_BLOCK8]:
    // [Format.RGBA_PVRTC2_8X4_UNORM_BLOCK8]:
    // [Format.RGBA_PVRTC2_8X4_SRGB_BLOCK8]:
    //
    // [Format.RGB_ETC_UNORM_BLOCK8]:
    // [Format.RGB_ATC_UNORM_BLOCK8]:
    // [Format.RGBA_ATCA_UNORM_BLOCK16]:
    // [Format.RGBA_ATCI_UNORM_BLOCK16]:
    //
    // [Format.L8_UNORM_PACK8]:
    // [Format.A8_UNORM_PACK8]:
    // [Format.LA8_UNORM_PACK8]:
    // [Format.L16_UNORM_PACK16]:
    // [Format.A16_UNORM_PACK16]:
    // [Format.LA16_UNORM_PACK16]:
    //
    // [Format.BGR8_UNORM_PACK32]:
    // [Format.BGR8_SRGB_PACK32]:
    //
    // [Format.RG3B2_UNORM_PACK8]:
};
