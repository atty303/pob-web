/// Texture data format
export enum Format {
  UNDEFINED = 0,

  RG4_UNORM_PACK8 = 1,
  FIRST = RG4_UNORM_PACK8,
  RGBA4_UNORM_PACK16 = 2,
  BGRA4_UNORM_PACK16 = 3,
  R5G6B5_UNORM_PACK16 = 4,
  B5G6R5_UNORM_PACK16 = 5,
  RGB5A1_UNORM_PACK16 = 6,
  BGR5A1_UNORM_PACK16 = 7,
  A1RGB5_UNORM_PACK16 = 8,

  R8_UNORM_PACK8 = 9,
  R8_SNORM_PACK8 = 10,
  R8_USCALED_PACK8 = 11,
  R8_SSCALED_PACK8 = 12,
  R8_UINT_PACK8 = 13,
  R8_SINT_PACK8 = 14,
  R8_SRGB_PACK8 = 15,

  RG8_UNORM_PACK8 = 16,
  RG8_SNORM_PACK8 = 17,
  RG8_USCALED_PACK8 = 18,
  RG8_SSCALED_PACK8 = 19,
  RG8_UINT_PACK8 = 20,
  RG8_SINT_PACK8 = 21,
  RG8_SRGB_PACK8 = 22,

  RGB8_UNORM_PACK8 = 23,
  RGB8_SNORM_PACK8 = 24,
  RGB8_USCALED_PACK8 = 25,
  RGB8_SSCALED_PACK8 = 26,
  RGB8_UINT_PACK8 = 27,
  RGB8_SINT_PACK8 = 28,
  RGB8_SRGB_PACK8 = 29,

  BGR8_UNORM_PACK8 = 30,
  BGR8_SNORM_PACK8 = 31,
  BGR8_USCALED_PACK8 = 32,
  BGR8_SSCALED_PACK8 = 33,
  BGR8_UINT_PACK8 = 34,
  BGR8_SINT_PACK8 = 35,
  BGR8_SRGB_PACK8 = 36,

  RGBA8_UNORM_PACK8 = 37,
  RGBA8_SNORM_PACK8 = 38,
  RGBA8_USCALED_PACK8 = 39,
  RGBA8_SSCALED_PACK8 = 40,
  RGBA8_UINT_PACK8 = 41,
  RGBA8_SINT_PACK8 = 42,
  RGBA8_SRGB_PACK8 = 43,

  BGRA8_UNORM_PACK8 = 44,
  BGRA8_SNORM_PACK8 = 45,
  BGRA8_USCALED_PACK8 = 46,
  BGRA8_SSCALED_PACK8 = 47,
  BGRA8_UINT_PACK8 = 48,
  BGRA8_SINT_PACK8 = 49,
  BGRA8_SRGB_PACK8 = 50,

  RGBA8_UNORM_PACK32 = 51,
  RGBA8_SNORM_PACK32 = 52,
  RGBA8_USCALED_PACK32 = 53,
  RGBA8_SSCALED_PACK32 = 54,
  RGBA8_UINT_PACK32 = 55,
  RGBA8_SINT_PACK32 = 56,
  RGBA8_SRGB_PACK32 = 57,

  RGB10A2_UNORM_PACK32 = 58,
  RGB10A2_SNORM_PACK32 = 59,
  RGB10A2_USCALED_PACK32 = 60,
  RGB10A2_SSCALED_PACK32 = 61,
  RGB10A2_UINT_PACK32 = 62,
  RGB10A2_SINT_PACK32 = 63,

  BGR10A2_UNORM_PACK32 = 64,
  BGR10A2_SNORM_PACK32 = 65,
  BGR10A2_USCALED_PACK32 = 66,
  BGR10A2_SSCALED_PACK32 = 67,
  BGR10A2_UINT_PACK32 = 68,
  BGR10A2_SINT_PACK32 = 69,

  R16_UNORM_PACK16 = 70,
  R16_SNORM_PACK16 = 71,
  R16_USCALED_PACK16 = 72,
  R16_SSCALED_PACK16 = 73,
  R16_UINT_PACK16 = 74,
  R16_SINT_PACK16 = 75,
  R16_SFLOAT_PACK16 = 76,

  RG16_UNORM_PACK16 = 77,
  RG16_SNORM_PACK16 = 78,
  RG16_USCALED_PACK16 = 79,
  RG16_SSCALED_PACK16 = 80,
  RG16_UINT_PACK16 = 81,
  RG16_SINT_PACK16 = 82,
  RG16_SFLOAT_PACK16 = 83,

  RGB16_UNORM_PACK16 = 84,
  RGB16_SNORM_PACK16 = 85,
  RGB16_USCALED_PACK16 = 86,
  RGB16_SSCALED_PACK16 = 87,
  RGB16_UINT_PACK16 = 88,
  RGB16_SINT_PACK16 = 89,
  RGB16_SFLOAT_PACK16 = 90,

  RGBA16_UNORM_PACK16 = 91,
  RGBA16_SNORM_PACK16 = 92,
  RGBA16_USCALED_PACK16 = 93,
  RGBA16_SSCALED_PACK16 = 94,
  RGBA16_UINT_PACK16 = 95,
  RGBA16_SINT_PACK16 = 96,
  RGBA16_SFLOAT_PACK16 = 97,

  R32_UINT_PACK32 = 98,
  R32_SINT_PACK32 = 99,
  R32_SFLOAT_PACK32 = 100,

  RG32_UINT_PACK32 = 101,
  RG32_SINT_PACK32 = 102,
  RG32_SFLOAT_PACK32 = 103,

  RGB32_UINT_PACK32 = 104,
  RGB32_SINT_PACK32 = 105,
  RGB32_SFLOAT_PACK32 = 106,

  RGBA32_UINT_PACK32 = 107,
  RGBA32_SINT_PACK32 = 108,
  RGBA32_SFLOAT_PACK32 = 109,

  R64_UINT_PACK64 = 110,
  R64_SINT_PACK64 = 111,
  R64_SFLOAT_PACK64 = 112,

  RG64_UINT_PACK64 = 113,
  RG64_SINT_PACK64 = 114,
  RG64_SFLOAT_PACK64 = 115,

  RGB64_UINT_PACK64 = 116,
  RGB64_SINT_PACK64 = 117,
  RGB64_SFLOAT_PACK64 = 118,

  RGBA64_UINT_PACK64 = 119,
  RGBA64_SINT_PACK64 = 120,
  RGBA64_SFLOAT_PACK64 = 121,

  RG11B10_UFLOAT_PACK32 = 122,
  RGB9E5_UFLOAT_PACK32 = 123,

  D16_UNORM_PACK16 = 124,
  D24_UNORM_PACK32 = 125,
  D32_SFLOAT_PACK32 = 126,
  S8_UINT_PACK8 = 127,
  D16_UNORM_S8_UINT_PACK32 = 128,
  D24_UNORM_S8_UINT_PACK32 = 129,
  D32_SFLOAT_S8_UINT_PACK64 = 130,

  RGB_DXT1_UNORM_BLOCK8 = 131,
  RGB_DXT1_SRGB_BLOCK8 = 132,
  RGBA_DXT1_UNORM_BLOCK8 = 133,
  RGBA_DXT1_SRGB_BLOCK8 = 134,
  RGBA_DXT3_UNORM_BLOCK16 = 135,
  RGBA_DXT3_SRGB_BLOCK16 = 136,
  RGBA_DXT5_UNORM_BLOCK16 = 137,
  RGBA_DXT5_SRGB_BLOCK16 = 138,
  R_ATI1N_UNORM_BLOCK8 = 139,
  R_ATI1N_SNORM_BLOCK8 = 140,
  RG_ATI2N_UNORM_BLOCK16 = 141,
  RG_ATI2N_SNORM_BLOCK16 = 142,
  RGB_BP_UFLOAT_BLOCK16 = 143,
  RGB_BP_SFLOAT_BLOCK16 = 144,
  RGBA_BP_UNORM_BLOCK16 = 145,
  RGBA_BP_SRGB_BLOCK16 = 146,

  RGB_ETC2_UNORM_BLOCK8 = 147,
  RGB_ETC2_SRGB_BLOCK8 = 148,
  RGBA_ETC2_UNORM_BLOCK8 = 149,
  RGBA_ETC2_SRGB_BLOCK8 = 150,
  RGBA_ETC2_UNORM_BLOCK16 = 151,
  RGBA_ETC2_SRGB_BLOCK16 = 152,
  R_EAC_UNORM_BLOCK8 = 153,
  R_EAC_SNORM_BLOCK8 = 154,
  RG_EAC_UNORM_BLOCK16 = 155,
  RG_EAC_SNORM_BLOCK16 = 156,

  RGBA_ASTC_4X4_UNORM_BLOCK16 = 157,
  RGBA_ASTC_4X4_SRGB_BLOCK16 = 158,
  RGBA_ASTC_5X4_UNORM_BLOCK16 = 159,
  RGBA_ASTC_5X4_SRGB_BLOCK16 = 160,
  RGBA_ASTC_5X5_UNORM_BLOCK16 = 161,
  RGBA_ASTC_5X5_SRGB_BLOCK16 = 162,
  RGBA_ASTC_6X5_UNORM_BLOCK16 = 163,
  RGBA_ASTC_6X5_SRGB_BLOCK16 = 164,
  RGBA_ASTC_6X6_UNORM_BLOCK16 = 165,
  RGBA_ASTC_6X6_SRGB_BLOCK16 = 166,
  RGBA_ASTC_8X5_UNORM_BLOCK16 = 167,
  RGBA_ASTC_8X5_SRGB_BLOCK16 = 168,
  RGBA_ASTC_8X6_UNORM_BLOCK16 = 169,
  RGBA_ASTC_8X6_SRGB_BLOCK16 = 170,
  RGBA_ASTC_8X8_UNORM_BLOCK16 = 171,
  RGBA_ASTC_8X8_SRGB_BLOCK16 = 172,
  RGBA_ASTC_10X5_UNORM_BLOCK16 = 173,
  RGBA_ASTC_10X5_SRGB_BLOCK16 = 174,
  RGBA_ASTC_10X6_UNORM_BLOCK16 = 175,
  RGBA_ASTC_10X6_SRGB_BLOCK16 = 176,
  RGBA_ASTC_10X8_UNORM_BLOCK16 = 177,
  RGBA_ASTC_10X8_SRGB_BLOCK16 = 178,
  RGBA_ASTC_10X10_UNORM_BLOCK16 = 179,
  RGBA_ASTC_10X10_SRGB_BLOCK16 = 180,
  RGBA_ASTC_12X10_UNORM_BLOCK16 = 181,
  RGBA_ASTC_12X10_SRGB_BLOCK16 = 182,
  RGBA_ASTC_12X12_UNORM_BLOCK16 = 183,
  RGBA_ASTC_12X12_SRGB_BLOCK16 = 184,

  RGB_PVRTC1_8X8_UNORM_BLOCK32 = 185,
  RGB_PVRTC1_8X8_SRGB_BLOCK32 = 186,
  RGB_PVRTC1_16X8_UNORM_BLOCK32 = 187,
  RGB_PVRTC1_16X8_SRGB_BLOCK32 = 188,
  RGBA_PVRTC1_8X8_UNORM_BLOCK32 = 189,
  RGBA_PVRTC1_8X8_SRGB_BLOCK32 = 190,
  RGBA_PVRTC1_16X8_UNORM_BLOCK32 = 191,
  RGBA_PVRTC1_16X8_SRGB_BLOCK32 = 192,
  RGBA_PVRTC2_4X4_UNORM_BLOCK8 = 193,
  RGBA_PVRTC2_4X4_SRGB_BLOCK8 = 194,
  RGBA_PVRTC2_8X4_UNORM_BLOCK8 = 195,
  RGBA_PVRTC2_8X4_SRGB_BLOCK8 = 196,

  RGB_ETC_UNORM_BLOCK8 = 197,
  RGB_ATC_UNORM_BLOCK8 = 198,
  RGBA_ATCA_UNORM_BLOCK16 = 199,
  RGBA_ATCI_UNORM_BLOCK16 = 200,

  L8_UNORM_PACK8 = 201,
  A8_UNORM_PACK8 = 202,
  LA8_UNORM_PACK8 = 203,
  L16_UNORM_PACK16 = 204,
  A16_UNORM_PACK16 = 205,
  LA16_UNORM_PACK16 = 206,

  BGR8_UNORM_PACK32 = 207,
  BGR8_SRGB_PACK32 = 208,

  RG3B2_UNORM_PACK8 = 209,
  LAST = RG3B2_UNORM_PACK8,
}

const FORMAT_COUNT = Format.LAST - Format.FIRST + 1;

/// Represent the source of a channel
export enum Swizzle {
  RED = 0,
  FIRST = RED,
  CHANNEL_FIRST = RED,
  GREEN = 1,
  BLUE = 2,
  ALPHA = 3,
  CHANNEL_LAST = ALPHA,
  ZERO = 4,
  ONE = 5,
  LAST = ONE,
}

const SWIZZLE_COUNT = Swizzle.LAST - Swizzle.FIRST + 1;

enum Cap {
  COMPRESSED_BIT = 1 << 0,
  COLORSPACE_SRGB_BIT = 1 << 1,
  NORMALIZED_BIT = 1 << 2,
  SCALED_BIT = 1 << 3,
  UNSIGNED_BIT = 1 << 4,
  SIGNED_BIT = 1 << 5,
  INTEGER_BIT = 1 << 6,
  FLOAT_BIT = 1 << 7,
  DEPTH_BIT = 1 << 8,
  STENCIL_BIT = 1 << 9,
  BIT = 1 << 10,
  LUMINANCE_ALPHA_BIT = 1 << 11,
  PACKED8_BIT = 1 << 12,
  PACKED16_BIT = 1 << 13,
  PACKED32_BIT = 1 << 14,
  DDS_GLI_EXT_BIT = 1 << 15,
  DECODER_BIT = 1 << 16,
}

export enum Ddpf {
  ALPHAPIXELS = 0x1,
  ALPHA = 0x2,
  FOURCC = 0x4,
  RGB = 0x40,
  YUV = 0x200,
  LUMINANCE = 0x20000,
  LUMINANCE_ALPHA = LUMINANCE | ALPHA,
  RGBAPIXELS = RGB | ALPHAPIXELS,
  RGBA = RGB | ALPHA,
  LUMINANCE_ALPHAPIXELS = LUMINANCE | ALPHAPIXELS,
}

export enum D3dFmt {
  UNKNOWN = 0,

  R8G8B8 = 20,
  A8R8G8B8 = 21,
  X8R8G8B8 = 22,
  R5G6B5 = 23,
  X1R5G5B5 = 24,
  A1R5G5B5 = 25,
  A4R4G4B4 = 26,
  R3G3B2 = 27,
  A8 = 28,
  A8R3G3B2 = 29,
  X4R4G4B4 = 30,
  A2B10G10R10 = 31,
  A8B8G8R8 = 32,
  X8B8G8R8 = 33,
  G16R16 = 34,
  A2R10G10B10 = 35,
  A16B16G16R16 = 36,

  A8P8 = 40,
  P8 = 41,

  L8 = 50,
  A8L8 = 51,
  A4L4 = 52,

  V8U8 = 60,
  L6V5U5 = 61,
  X8L8V8U8 = 62,
  Q8W8V8U8 = 63,
  V16U16 = 64,
  A2W10V10U10 = 67,

  UYVY = 0x59565955,
  R8G8_B8G8 = 0x47424752, // "RGBG"
  YUY2 = 0x32595559,
  G8R8_G8B8 = 0x42475247, // "GRGB"
  DXT1 = 0x31545844,
  DXT2 = 0x32545844,
  DXT3 = 0x33545844,
  DXT4 = 0x34545844,
  DXT5 = 0x35545844,

  ATI1 = 0x31495441,
  AT1N = 0x4e315441,
  ATI2 = 0x32495441,
  AT2N = 0x4e325441,

  BC4U = 0x55344342,
  BC4S = 0x53344342,
  BC5U = 0x55354342,
  BC5S = 0x53354342,

  ETC = 0x20435445, // "ETC "
  ETC1 = 0x31435445, // "ETC1"
  ATC = 0x20435441, // "ATC "
  ATCA = 0x41435441, // "ATCA"
  ATCI = 0x49435441, // "ATCI"

  POWERVR_2BPP = 0x32435450, // "PTC2"
  POWERVR_4BPP = 0x34435450, // "PTC4"

  D16_LOCKABLE = 70,
  D32 = 71,
  D15S1 = 73,
  D24S8 = 75,
  D24X8 = 77,
  D24X4S4 = 79,
  D16 = 80,

  D32F_LOCKABLE = 82,
  D24FS8 = 83,

  L16 = 81,

  VERTEXDATA = 100,
  INDEX16 = 101,
  INDEX32 = 102,

  Q16W16V16U16 = 110,

  MULTI2_ARGB8 = 0x3154454d, // "MET1"

  R16F = 111,
  G16R16F = 112,
  A16B16G16R16F = 113,

  R32F = 114,
  G32R32F = 115,
  A32B32G32R32F = 116,

  CxV8U8 = 117,

  DX10 = 0x30315844, // "DX10"

  GLI1 = 0x31494c47, // "GLI1"

  FORCE_DWORD = 0x7fffffff,
}

enum DxgiFormatDds {
  UNKNOWN = 0,
  R32G32B32A32_TYPELESS = 1,
  R32G32B32A32_FLOAT = 2,
  R32G32B32A32_UINT = 3,
  R32G32B32A32_SINT = 4,
  R32G32B32_TYPELESS = 5,
  R32G32B32_FLOAT = 6,
  R32G32B32_UINT = 7,
  R32G32B32_SINT = 8,
  R16G16B16A16_TYPELESS = 9,
  R16G16B16A16_FLOAT = 10,
  R16G16B16A16_UNORM = 11,
  R16G16B16A16_UINT = 12,
  R16G16B16A16_SNORM = 13,
  R16G16B16A16_SINT = 14,
  R32G32_TYPELESS = 15,
  R32G32_FLOAT = 16,
  R32G32_UINT = 17,
  R32G32_SINT = 18,
  R32G8X24_TYPELESS = 19,
  D32_FLOAT_S8X24_UINT = 20,
  R32_FLOAT_X8X24_TYPELESS = 21,
  X32_TYPELESS_G8X24_UINT = 22,
  R10G10B10A2_TYPELESS = 23,
  R10G10B10A2_UNORM = 24,
  R10G10B10A2_UINT = 25,
  R11G11B10_FLOAT = 26,
  R8G8B8A8_TYPELESS = 27,
  R8G8B8A8_UNORM = 28,
  R8G8B8A8_UNORM_SRGB = 29,
  R8G8B8A8_UINT = 30,
  R8G8B8A8_SNORM = 31,
  R8G8B8A8_SINT = 32,
  R16G16_TYPELESS = 33,
  R16G16_FLOAT = 34,
  R16G16_UNORM = 35,
  R16G16_UINT = 36,
  R16G16_SNORM = 37,
  R16G16_SINT = 38,
  R32_TYPELESS = 39,
  D32_FLOAT = 40,
  R32_FLOAT = 41,
  R32_UINT = 42,
  R32_SINT = 43,
  R24G8_TYPELESS = 44,
  D24_UNORM_S8_UINT = 45,
  R24_UNORM_X8_TYPELESS = 46,
  X24_TYPELESS_G8_UINT = 47,
  R8G8_TYPELESS = 48,
  R8G8_UNORM = 49,
  R8G8_UINT = 50,
  R8G8_SNORM = 51,
  R8G8_SINT = 52,
  R16_TYPELESS = 53,
  R16_FLOAT = 54,
  D16_UNORM = 55,
  R16_UNORM = 56,
  R16_UINT = 57,
  R16_SNORM = 58,
  R16_SINT = 59,
  R8_TYPELESS = 60,
  R8_UNORM = 61,
  R8_UINT = 62,
  R8_SNORM = 63,
  R8_SINT = 64,
  A8_UNORM = 65,
  R1_UNORM = 66,
  R9G9B9E5_SHAREDEXP = 67,
  R8G8_B8G8_UNORM = 68,
  G8R8_G8B8_UNORM = 69,
  BC1_TYPELESS = 70,
  BC1_UNORM = 71,
  BC1_UNORM_SRGB = 72,
  BC2_TYPELESS = 73,
  BC2_UNORM = 74,
  BC2_UNORM_SRGB = 75,
  BC3_TYPELESS = 76,
  BC3_UNORM = 77,
  BC3_UNORM_SRGB = 78,
  BC4_TYPELESS = 79,
  BC4_UNORM = 80,
  BC4_SNORM = 81,
  BC5_TYPELESS = 82,
  BC5_UNORM = 83,
  BC5_SNORM = 84,
  B5G6R5_UNORM = 85,
  B5G5R5A1_UNORM = 86,
  B8G8R8A8_UNORM = 87,
  B8G8R8X8_UNORM = 88,
  R10G10B10_XR_BIAS_A2_UNORM = 89,
  B8G8R8A8_TYPELESS = 90,
  B8G8R8A8_UNORM_SRGB = 91,
  B8G8R8X8_TYPELESS = 92,
  B8G8R8X8_UNORM_SRGB = 93,
  BC6H_TYPELESS = 94,
  BC6H_UF16 = 95,
  BC6H_SF16 = 96,
  BC7_TYPELESS = 97,
  BC7_UNORM = 98,
  BC7_UNORM_SRGB = 99,
  AYUV = 100,
  Y410 = 101,
  Y416 = 102,
  NV12 = 103,
  P010 = 104,
  P016 = 105,
  F420_OPAQUE = 106,
  YUY2 = 107,
  Y210 = 108,
  Y216 = 109,
  NV11 = 110,
  AI44 = 111,
  IA44 = 112,
  P8 = 113,
  A8P8 = 114,
  B4G4R4A4_UNORM = 115,

  P208 = 130,
  V208 = 131,
  V408 = 132,
  ASTC_4X4_TYPELESS = 133,
  ASTC_4X4_UNORM = 134,
  ASTC_4X4_UNORM_SRGB = 135,
  ASTC_5X4_TYPELESS = 137,
  ASTC_5X4_UNORM = 138,
  ASTC_5X4_UNORM_SRGB = 139,
  ASTC_5X5_TYPELESS = 141,
  ASTC_5X5_UNORM = 142,
  ASTC_5X5_UNORM_SRGB = 143,
  ASTC_6X5_TYPELESS = 145,
  ASTC_6X5_UNORM = 146,
  ASTC_6X5_UNORM_SRGB = 147,
  ASTC_6X6_TYPELESS = 149,
  ASTC_6X6_UNORM = 150,
  ASTC_6X6_UNORM_SRGB = 151,
  ASTC_8X5_TYPELESS = 153,
  ASTC_8X5_UNORM = 154,
  ASTC_8X5_UNORM_SRGB = 155,
  ASTC_8X6_TYPELESS = 157,
  ASTC_8X6_UNORM = 158,
  ASTC_8X6_UNORM_SRGB = 159,
  ASTC_8X8_TYPELESS = 161,
  ASTC_8X8_UNORM = 162,
  ASTC_8X8_UNORM_SRGB = 163,
  ASTC_10X5_TYPELESS = 165,
  ASTC_10X5_UNORM = 166,
  ASTC_10X5_UNORM_SRGB = 167,
  ASTC_10X6_TYPELESS = 169,
  ASTC_10X6_UNORM = 170,
  ASTC_10X6_UNORM_SRGB = 171,
  ASTC_10X8_TYPELESS = 173,
  ASTC_10X8_UNORM = 174,
  ASTC_10X8_UNORM_SRGB = 175,
  ASTC_10X10_TYPELESS = 177,
  ASTC_10X10_UNORM = 178,
  ASTC_10X10_UNORM_SRGB = 179,
  ASTC_12X10_TYPELESS = 181,
  ASTC_12X10_UNORM = 182,
  ASTC_12X10_UNORM_SRGB = 183,
  ASTC_12X12_TYPELESS = 185,
  ASTC_12X12_UNORM = 186,
  ASTC_12X12_UNORM_SRGB = 187,

  FORCE_UINT = 0xffffffff,
}

enum DxgiFormatGli {
  R64_UINT_GLI = 1,
  R64_SINT_GLI = 2,
  R64_FLOAT_GLI = 3,
  R64G64_UINT_GLI = 4,
  R64G64_SINT_GLI = 5,
  R64G64_FLOAT_GLI = 6,
  R64G64B64_UINT_GLI = 7,
  R64G64B64_SINT_GLI = 8,
  R64G64B64_FLOAT_GLI = 9,
  R64G64B64A64_UINT_GLI = 10,
  R64G64B64A64_SINT_GLI = 11,
  R64G64B64A64_FLOAT_GLI = 12,

  RG4_UNORM_GLI = 13,
  RGBA4_UNORM_GLI = 14,
  R5G6B5_UNORM_GLI = 15,
  R5G5B5A1_UNORM_GLI = 16,
  A1B5G5R5_UNORM_GLI = 17,

  R8_SRGB_GLI = 18,
  R8_USCALED_GLI = 19,
  R8_SSCALED_GLI = 20,

  R8G8_SRGB_GLI = 21,
  R8G8_USCALED_GLI = 22,
  R8G8_SSCALED_GLI = 23,

  R8G8B8_UNORM_GLI = 24,
  R8G8B8_SNORM_GLI = 25,
  R8G8B8_USCALED_GLI = 26,
  R8G8B8_SSCALED_GLI = 27,
  R8G8B8_UINT_GLI = 28,
  R8G8B8_SINT_GLI = 29,
  R8G8B8_SRGB_GLI = 30,

  B8G8R8_UNORM_GLI = 31,
  B8G8R8_SNORM_GLI = 32,
  B8G8R8_USCALED_GLI = 33,
  B8G8R8_SSCALED_GLI = 34,
  B8G8R8_UINT_GLI = 35,
  B8G8R8_SINT_GLI = 36,
  B8G8R8_SRGB_GLI = 37,

  R8G8B8A8_USCALED_GLI = 38,
  R8G8B8A8_SSCALED_GLI = 39,

  B8G8R8A8_SNORM_GLI = 40,
  B8G8R8A8_USCALED_GLI = 41,
  B8G8R8A8_SSCALED_GLI = 42,
  B8G8R8A8_UINT_GLI = 43,
  B8G8R8A8_SINT_GLI = 44,

  R8G8B8A8_PACK_UNORM_GLI = 45,
  R8G8B8A8_PACK_SNORM_GLI = 46,
  R8G8B8A8_PACK_USCALED_GLI = 47,
  R8G8B8A8_PACK_SSCALED_GLI = 48,
  R8G8B8A8_PACK_UINT_GLI = 49,
  R8G8B8A8_PACK_SINT_GLI = 50,
  R8G8B8A8_PACK_SRGB_GLI = 51,

  R10G10B10A2_SNORM_GLI = 52,
  R10G10B10A2_USCALED_GLI = 53,
  R10G10B10A2_SSCALED_GLI = 54,
  R10G10B10A2_SINT_GLI = 55,

  B10G10R10A2_UNORM_GLI = 56,
  B10G10R10A2_SNORM_GLI = 57,
  B10G10R10A2_USCALED_GLI = 58,
  B10G10R10A2_SSCALED_GLI = 59,
  B10G10R10A2_UINT_GLI = 60,
  B10G10R10A2_SINT_GLI = 61,

  R16_USCALED_GLI = 62,
  R16_SSCALED_GLI = 63,
  R16G16_USCALED_GLI = 64,
  R16G16_SSCALED_GLI = 65,

  R16G16B16_UNORM_GLI = 66,
  R16G16B16_SNORM_GLI = 67,
  R16G16B16_USCALED_GLI = 68,
  R16G16B16_SSCALED_GLI = 69,
  R16G16B16_UINT_GLI = 70,
  R16G16B16_SINT_GLI = 71,
  R16G16B16_FLOAT_GLI = 72,

  R16G16B16A16_USCALED_GLI = 73,
  R16G16B16A16_SSCALED_GLI = 74,

  S8_UINT_GLI = 75,
  D16_UNORM_S8_UINT_GLI = 76,
  D24_UNORM_GLI = 77,

  L8_UNORM_GLI = 78,
  A8_UNORM_GLI = 79,
  LA8_UNORM_GLI = 80,
  L16_UNORM_GLI = 81,
  A16_UNORM_GLI = 82,
  LA16_UNORM_GLI = 83,

  R3G3B2_UNORM_GLI = 84,

  BC1_RGB_UNORM_GLI = 85,
  BC1_RGB_SRGB_GLI = 86,
  RGB_ETC2_UNORM_GLI = 87,
  RGB_ETC2_SRGB_GLI = 88,
  RGBA_ETC2_A1_UNORM_GLI = 89,
  RGBA_ETC2_A1_SRGB_GLI = 90,
  RGBA_ETC2_UNORM_GLI = 91,
  RGBA_ETC2_SRGB_GLI = 92,
  R11_EAC_UNORM_GLI = 93,
  R11_EAC_SNORM_GLI = 94,
  RG11_EAC_UNORM_GLI = 95,
  RG11_EAC_SNORM_GLI = 96,

  RGB_PVRTC1_8X8_UNORM_GLI = 97,
  RGB_PVRTC1_8X8_SRGB_GLI = 98,
  RGB_PVRTC1_16X8_UNORM_GLI = 99,
  RGB_PVRTC1_16X8_SRGB_GLI = 100,
  RGBA_PVRTC1_8X8_UNORM_GLI = 101,
  RGBA_PVRTC1_8X8_SRGB_GLI = 102,
  RGBA_PVRTC1_16X8_UNORM_GLI = 103,
  RGBA_PVRTC1_16X8_SRGB_GLI = 104,
  RGBA_PVRTC2_8X8_UNORM_GLI = 105,
  RGBA_PVRTC2_8X8_SRGB_GLI = 106,
  RGBA_PVRTC2_16X8_UNORM_GLI = 107,
  RGBA_PVRTC2_16X8_SRGB_GLI = 108,

  RGB_ETC_UNORM_GLI = 109,
  RGB_ATC_UNORM_GLI = 110,
  RGBA_ATCA_UNORM_GLI = 111,
  RGBA_ATCI_UNORM_GLI = 112,
}

type FormatInfo = {
  blockSize: number;
  blockExtent: [number, number, number];
  component: number;
  swizzles: [Swizzle, Swizzle, Swizzle, Swizzle];
  flags: number;

  ddPixelFormat: Ddpf;
  d3dFormat: D3dFmt;
  dxgiFormat: DxgiFormatDds | DxgiFormatGli;
  mask: [number, number, number, number];
};

// biome-ignore format: compact
const formatInfos: Record<Format, FormatInfo> = {
    [Format.UNDEFINED]: { blockSize: 0, blockExtent: [0, 0, 0], component: 0, swizzles: [Swizzle.ZERO, Swizzle.ZERO, Swizzle.ZERO, Swizzle.ZERO], flags: 0, ddPixelFormat: Ddpf.RGBA, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatGli.R64_UINT_GLI, mask: [0, 0, 0, 0] },

    [Format.RG4_UNORM_PACK8]: { blockSize: 1, blockExtent: [1, 1, 1], component: 2, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.ZERO, Swizzle.ONE], flags: Cap.PACKED8_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.RG4_UNORM_GLI, mask: [0x000F, 0x00F0, 0x0000, 0x0000] },
    [Format.RGBA4_UNORM_PACK16]: { blockSize: 2, blockExtent: [1, 1, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.PACKED16_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.RGBA4_UNORM_GLI, mask: [0x000F, 0x00F0, 0x0000, 0x0000]  },
    [Format.BGRA4_UNORM_PACK16]: { blockSize: 2, blockExtent: [1, 1, 1], component: 4, swizzles: [Swizzle.BLUE, Swizzle.GREEN, Swizzle.RED, Swizzle.ALPHA], flags: Cap.PACKED16_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.A4R4G4B4, dxgiFormat: DxgiFormatDds.B4G4R4A4_UNORM, mask: [0x0F00, 0x00F0, 0x000F, 0xF000]  },
    [Format.R5G6B5_UNORM_PACK16]: { blockSize: 2, blockExtent: [1, 1, 1], component: 3, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ONE], flags: Cap.PACKED16_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.R5G6B5_UNORM_GLI, mask: [0x001f, 0x07e0, 0xf800, 0x0000]  },
    [Format.B5G6R5_UNORM_PACK16]: { blockSize: 2, blockExtent: [1, 1, 1], component: 3, swizzles: [Swizzle.BLUE, Swizzle.GREEN, Swizzle.RED, Swizzle.ONE], flags: Cap.PACKED16_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.R5G6B5, dxgiFormat: DxgiFormatDds.B5G6R5_UNORM, mask: [0xf800, 0x07e0, 0x001f, 0x0000]  },
    [Format.RGB5A1_UNORM_PACK16]: { blockSize: 2, blockExtent: [1, 1, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.PACKED16_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.R5G5B5A1_UNORM_GLI, mask: [0x001f, 0x03e0, 0x7c00, 0x8000]  },
    [Format.BGR5A1_UNORM_PACK16]: { blockSize: 2, blockExtent: [1, 1, 1], component: 4, swizzles: [Swizzle.BLUE, Swizzle.GREEN, Swizzle.RED, Swizzle.ALPHA], flags: Cap.PACKED16_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.A1R5G5B5, dxgiFormat: DxgiFormatDds.B5G5R5A1_UNORM, mask: [0x7c00, 0x03e0, 0x001f, 0x8000]  },
    [Format.A1RGB5_UNORM_PACK16]: { blockSize: 2, blockExtent: [1, 1, 1], component: 4, swizzles: [Swizzle.ALPHA, Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE], flags: Cap.PACKED16_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.A1B5G5R5_UNORM_GLI, mask: [0x7c00, 0x03e0, 0x001f, 0x8000]  },

    [Format.R8_UNORM_PACK8]: { blockSize: 1, blockExtent: [1, 1, 1], component: 1, swizzles: [Swizzle.RED, Swizzle.ZERO, Swizzle.ZERO, Swizzle.ONE], flags: Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.R8_UNORM, mask: [0x00FF0000, 0x00000000, 0x00000000, 0x00000000] },
    [Format.R8_SNORM_PACK8]: { blockSize: 1, blockExtent: [1, 1, 1], component: 1, swizzles: [Swizzle.RED, Swizzle.ZERO, Swizzle.ZERO, Swizzle.ONE], flags: Cap.NORMALIZED_BIT | Cap.SIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.R8_SNORM, mask: [0, 0, 0, 0] },
    [Format.R8_USCALED_PACK8]: { blockSize: 1, blockExtent: [1, 1, 1], component: 1, swizzles: [Swizzle.RED, Swizzle.ZERO, Swizzle.ZERO, Swizzle.ONE], flags: Cap.SCALED_BIT | Cap.UNSIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.R8_USCALED_GLI, mask: [0x00FF0000, 0x00000000, 0x00000000, 0x00000000] },
    [Format.R8_SSCALED_PACK8]: { blockSize: 1, blockExtent: [1, 1, 1], component: 1, swizzles: [Swizzle.RED, Swizzle.ZERO, Swizzle.ZERO, Swizzle.ONE], flags: Cap.SCALED_BIT | Cap.SIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.R8_SSCALED_GLI, mask: [0, 0, 0, 0] },
    [Format.R8_UINT_PACK8]: { blockSize: 1, blockExtent: [1, 1, 1], component: 1, swizzles: [Swizzle.RED, Swizzle.ZERO, Swizzle.ZERO, Swizzle.ONE], flags: Cap.INTEGER_BIT | Cap.UNSIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.R8_UINT, mask: [0, 0, 0, 0] },
    [Format.R8_SINT_PACK8]: { blockSize: 1, blockExtent: [1, 1, 1], component: 1, swizzles: [Swizzle.RED, Swizzle.ZERO, Swizzle.ZERO, Swizzle.ONE], flags: Cap.INTEGER_BIT | Cap.SIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.R8_SINT, mask: [0, 0, 0, 0] },
    [Format.R8_SRGB_PACK8]: { blockSize: 1, blockExtent: [1, 1, 1], component: 1, swizzles: [Swizzle.RED, Swizzle.ZERO, Swizzle.ZERO, Swizzle.ONE], flags: Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT | Cap.COLORSPACE_SRGB_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.R8_SRGB_GLI, mask: [0, 0, 0, 0] },

    [Format.RG8_UNORM_PACK8]: { blockSize: 2, blockExtent: [1, 1, 1], component: 2, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.ZERO, Swizzle.ONE], flags: Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.R8G8_UNORM, mask: [0x00FF0000, 0x0000FF00, 0x00000000, 0x00000000] },
    [Format.RG8_SNORM_PACK8]: { blockSize: 2, blockExtent: [1, 1, 1], component: 2, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.ZERO, Swizzle.ONE], flags: Cap.NORMALIZED_BIT | Cap.SIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.R8G8_SNORM, mask: [0, 0, 0, 0] },
    [Format.RG8_USCALED_PACK8]: { blockSize: 2, blockExtent: [1, 1, 1], component: 2, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.ZERO, Swizzle.ONE], flags: Cap.SCALED_BIT | Cap.UNSIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.R8G8_USCALED_GLI, mask: [0x00FF0000, 0x0000FF00, 0x00000000, 0x00000000] },
    [Format.RG8_SSCALED_PACK8]: { blockSize: 2, blockExtent: [1, 1, 1], component: 2, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.ZERO, Swizzle.ONE], flags: Cap.SCALED_BIT | Cap.SIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.R8G8_SSCALED_GLI, mask: [0, 0, 0, 0] },
    [Format.RG8_UINT_PACK8]: { blockSize: 2, blockExtent: [1, 1, 1], component: 2, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.ZERO, Swizzle.ONE], flags: Cap.INTEGER_BIT | Cap.UNSIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.R8G8_UINT, mask: [0, 0, 0, 0] },
    [Format.RG8_SINT_PACK8]: { blockSize: 2, blockExtent: [1, 1, 1], component: 2, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.ZERO, Swizzle.ONE], flags: Cap.INTEGER_BIT | Cap.SIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.R8G8_SINT, mask: [0, 0, 0, 0] },
    [Format.RG8_SRGB_PACK8]: { blockSize: 2, blockExtent: [1, 1, 1], component: 2, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.ZERO, Swizzle.ONE], flags: Cap.NORMALIZED_BIT | Cap.SIGNED_BIT | Cap.COLORSPACE_SRGB_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.R8G8_SRGB_GLI, mask: [0, 0, 0, 0] },

    [Format.RGB8_UNORM_PACK8]: { blockSize: 3, blockExtent: [1, 1, 1], component: 3, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ONE], flags: Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.RGB, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.R8G8B8_UNORM_GLI, mask: [0x000000FF, 0x0000FF00, 0x00FF0000, 0x00000000] },
    [Format.RGB8_SNORM_PACK8]: { blockSize: 3, blockExtent: [1, 1, 1], component: 3, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ONE], flags: Cap.NORMALIZED_BIT | Cap.SIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.R8G8B8_SNORM_GLI, mask: [0, 0, 0, 0] },
    [Format.RGB8_USCALED_PACK8]: { blockSize: 3, blockExtent: [1, 1, 1], component: 3, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ONE], flags: Cap.SCALED_BIT | Cap.UNSIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.R8G8B8_USCALED_GLI, mask: [0, 0, 0, 0] },
    [Format.RGB8_SSCALED_PACK8]: { blockSize: 3, blockExtent: [1, 1, 1], component: 3, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ONE], flags: Cap.SCALED_BIT | Cap.SIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.R8G8B8_SSCALED_GLI, mask: [0, 0, 0, 0] },
    [Format.RGB8_UINT_PACK8]: { blockSize: 3, blockExtent: [1, 1, 1], component: 3, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ONE], flags: Cap.INTEGER_BIT | Cap.UNSIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.R8G8B8_UINT_GLI, mask: [0, 0, 0, 0] },
    [Format.RGB8_SINT_PACK8]: { blockSize: 3, blockExtent: [1, 1, 1], component: 3, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ONE], flags: Cap.INTEGER_BIT | Cap.SIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.R8G8B8_SINT_GLI, mask: [0, 0, 0, 0] },
    [Format.RGB8_SRGB_PACK8]: { blockSize: 3, blockExtent: [1, 1, 1], component: 3, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ONE], flags: Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT | Cap.COLORSPACE_SRGB_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.R8G8B8_SRGB_GLI, mask: [0, 0, 0, 0] },

    [Format.BGR8_UNORM_PACK8]: { blockSize: 3, blockExtent: [1, 1, 1], component: 3, swizzles: [Swizzle.BLUE, Swizzle.GREEN, Swizzle.RED, Swizzle.ONE], flags: Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT | Cap.BIT, ddPixelFormat: Ddpf.RGB, d3dFormat: D3dFmt.R8G8B8, dxgiFormat: DxgiFormatGli.B8G8R8_UNORM_GLI, mask: [0x00FF0000, 0x0000FF00, 0x000000FF, 0x00000000] },
    [Format.BGR8_SNORM_PACK8]: { blockSize: 3, blockExtent: [1, 1, 1], component: 3, swizzles: [Swizzle.BLUE, Swizzle.GREEN, Swizzle.RED, Swizzle.ONE], flags: Cap.NORMALIZED_BIT | Cap.SIGNED_BIT | Cap.BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.B8G8R8_SNORM_GLI, mask: [0, 0, 0, 0] },
    [Format.BGR8_USCALED_PACK8]: { blockSize: 3, blockExtent: [1, 1, 1], component: 3, swizzles: [Swizzle.BLUE, Swizzle.GREEN, Swizzle.RED, Swizzle.ONE], flags: Cap.SCALED_BIT | Cap.UNSIGNED_BIT | Cap.BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.B8G8R8_USCALED_GLI, mask: [0, 0, 0, 0] },
    [Format.BGR8_SSCALED_PACK8]: { blockSize: 3, blockExtent: [1, 1, 1], component: 3, swizzles: [Swizzle.BLUE, Swizzle.GREEN, Swizzle.RED, Swizzle.ONE], flags: Cap.SCALED_BIT | Cap.SIGNED_BIT | Cap.BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.B8G8R8_SSCALED_GLI, mask: [0, 0, 0, 0] },
    [Format.BGR8_UINT_PACK8]: { blockSize: 3, blockExtent: [1, 1, 1], component: 3, swizzles: [Swizzle.BLUE, Swizzle.GREEN, Swizzle.RED, Swizzle.ONE], flags: Cap.INTEGER_BIT | Cap.UNSIGNED_BIT | Cap.BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.B8G8R8_UINT_GLI, mask: [0, 0, 0, 0] },
    [Format.BGR8_SINT_PACK8]: { blockSize: 3, blockExtent: [1, 1, 1], component: 3, swizzles: [Swizzle.BLUE, Swizzle.GREEN, Swizzle.RED, Swizzle.ONE], flags: Cap.INTEGER_BIT | Cap.SIGNED_BIT | Cap.BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.B8G8R8_SINT_GLI, mask: [0, 0, 0, 0] },
    [Format.BGR8_SRGB_PACK8]: { blockSize: 3, blockExtent: [1, 1, 1], component: 3, swizzles: [Swizzle.BLUE, Swizzle.GREEN, Swizzle.RED, Swizzle.ONE], flags: Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT | Cap.COLORSPACE_SRGB_BIT | Cap.BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.B8G8R8_SRGB_GLI, mask: [0, 0, 0, 0] },

    [Format.RGBA8_UNORM_PACK8]: { blockSize: 4, blockExtent: [1, 1, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.R8G8B8A8_UNORM, mask: [0x000000FF, 0x0000FF00, 0x00FF0000, 0xFF000000] },
    [Format.RGBA8_SNORM_PACK8]: { blockSize: 4, blockExtent: [1, 1, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.NORMALIZED_BIT | Cap.SIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.R8G8B8A8_SNORM, mask: [0, 0, 0, 0] },
    [Format.RGBA8_USCALED_PACK8]: { blockSize: 4, blockExtent: [1, 1, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.SCALED_BIT | Cap.UNSIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.R8G8B8A8_USCALED_GLI, mask: [0, 0, 0, 0] },
    [Format.RGBA8_SSCALED_PACK8]: { blockSize: 4, blockExtent: [1, 1, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.SCALED_BIT | Cap.SIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.R8G8B8A8_SSCALED_GLI, mask: [0, 0, 0, 0] },
    [Format.RGBA8_UINT_PACK8]: { blockSize: 4, blockExtent: [1, 1, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.INTEGER_BIT | Cap.UNSIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.R8G8B8A8_UINT, mask: [0, 0, 0, 0] },
    [Format.RGBA8_SINT_PACK8]: { blockSize: 4, blockExtent: [1, 1, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.INTEGER_BIT | Cap.SIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.R8G8B8A8_SINT, mask: [0, 0, 0, 0] },
    [Format.RGBA8_SRGB_PACK8]: { blockSize: 4, blockExtent: [1, 1, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT | Cap.COLORSPACE_SRGB_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.R8G8B8A8_UNORM_SRGB, mask: [0, 0, 0, 0] },

    [Format.BGRA8_UNORM_PACK8]: { blockSize: 4, blockExtent: [1, 1, 1], component: 4, swizzles: [Swizzle.BLUE, Swizzle.GREEN, Swizzle.RED, Swizzle.ALPHA], flags: Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT | Cap.BIT, ddPixelFormat: Ddpf.RGBA, d3dFormat: D3dFmt.A8R8G8B8, dxgiFormat: DxgiFormatDds.B8G8R8A8_UNORM, mask: [0x00FF0000, 0x0000FF00, 0x000000FF, 0xFF000000] },
    [Format.BGRA8_SNORM_PACK8]: { blockSize: 4, blockExtent: [1, 1, 1], component: 4, swizzles: [Swizzle.BLUE, Swizzle.GREEN, Swizzle.RED, Swizzle.ALPHA], flags: Cap.NORMALIZED_BIT | Cap.SIGNED_BIT | Cap.BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.B8G8R8A8_SNORM_GLI, mask: [0, 0, 0, 0] },
    [Format.BGRA8_USCALED_PACK8]: { blockSize: 4, blockExtent: [1, 1, 1], component: 4, swizzles: [Swizzle.BLUE, Swizzle.GREEN, Swizzle.RED, Swizzle.ALPHA], flags: Cap.SCALED_BIT | Cap.UNSIGNED_BIT | Cap.BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.B8G8R8A8_USCALED_GLI, mask: [0, 0, 0, 0] },
    [Format.BGRA8_SSCALED_PACK8]: { blockSize: 4, blockExtent: [1, 1, 1], component: 4, swizzles: [Swizzle.BLUE, Swizzle.GREEN, Swizzle.RED, Swizzle.ALPHA], flags: Cap.SCALED_BIT | Cap.SIGNED_BIT | Cap.BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.B8G8R8A8_SSCALED_GLI, mask: [0, 0, 0, 0] },
    [Format.BGRA8_UINT_PACK8]: { blockSize: 4, blockExtent: [1, 1, 1], component: 4, swizzles: [Swizzle.BLUE, Swizzle.GREEN, Swizzle.RED, Swizzle.ALPHA], flags: Cap.INTEGER_BIT | Cap.UNSIGNED_BIT | Cap.BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.B8G8R8A8_UINT_GLI, mask: [0, 0, 0, 0] },
    [Format.BGRA8_SINT_PACK8]: { blockSize: 4, blockExtent: [1, 1, 1], component: 4, swizzles: [Swizzle.BLUE, Swizzle.GREEN, Swizzle.RED, Swizzle.ALPHA], flags: Cap.INTEGER_BIT | Cap.SIGNED_BIT | Cap.BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.B8G8R8A8_SINT_GLI, mask: [0, 0, 0, 0] },
    [Format.BGRA8_SRGB_PACK8]: { blockSize: 4, blockExtent: [1, 1, 1], component: 4, swizzles: [Swizzle.BLUE, Swizzle.GREEN, Swizzle.RED, Swizzle.ALPHA], flags: Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT | Cap.COLORSPACE_SRGB_BIT | Cap.BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.B8G8R8A8_UNORM_SRGB, mask: [0x00FF0000, 0x0000FF00, 0x000000FF, 0xFF000000] },

    [Format.RGBA8_UNORM_PACK32]: { blockSize: 4, blockExtent: [1, 1, 1], component: 4, swizzles: [Swizzle.BLUE, Swizzle.GREEN, Swizzle.RED, Swizzle.ALPHA], flags: Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT | Cap.BIT | Cap.PACKED32_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.R8G8B8A8_PACK_UNORM_GLI, mask: [0x00FF0000, 0x0000FF00, 0x000000FF, 0xFF000000] },
    [Format.RGBA8_SNORM_PACK32]: { blockSize: 4, blockExtent: [1, 1, 1], component: 4, swizzles: [Swizzle.BLUE, Swizzle.GREEN, Swizzle.RED, Swizzle.ALPHA], flags: Cap.NORMALIZED_BIT | Cap.SIGNED_BIT | Cap.BIT | Cap.PACKED32_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.R8G8B8A8_PACK_SNORM_GLI, mask: [0, 0, 0, 0] },
    [Format.RGBA8_USCALED_PACK32]: { blockSize: 4, blockExtent: [1, 1, 1], component: 4, swizzles: [Swizzle.BLUE, Swizzle.GREEN, Swizzle.RED, Swizzle.ALPHA], flags: Cap.SCALED_BIT | Cap.UNSIGNED_BIT | Cap.BIT | Cap.PACKED32_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.R8G8B8A8_PACK_USCALED_GLI, mask: [0, 0, 0, 0] },
    [Format.RGBA8_SSCALED_PACK32]: { blockSize: 4, blockExtent: [1, 1, 1], component: 4, swizzles: [Swizzle.BLUE, Swizzle.GREEN, Swizzle.RED, Swizzle.ALPHA], flags: Cap.SCALED_BIT | Cap.SIGNED_BIT | Cap.BIT | Cap.PACKED32_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.R8G8B8A8_PACK_SSCALED_GLI, mask: [0, 0, 0, 0] },
    [Format.RGBA8_UINT_PACK32]: { blockSize: 4, blockExtent: [1, 1, 1], component: 4, swizzles: [Swizzle.BLUE, Swizzle.GREEN, Swizzle.RED, Swizzle.ALPHA], flags: Cap.INTEGER_BIT | Cap.UNSIGNED_BIT | Cap.BIT | Cap.PACKED32_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.R8G8B8A8_PACK_UINT_GLI, mask: [0, 0, 0, 0] },
    [Format.RGBA8_SINT_PACK32]: { blockSize: 4, blockExtent: [1, 1, 1], component: 4, swizzles: [Swizzle.BLUE, Swizzle.GREEN, Swizzle.RED, Swizzle.ALPHA], flags: Cap.INTEGER_BIT | Cap.SIGNED_BIT | Cap.BIT | Cap.PACKED32_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.R8G8B8A8_PACK_SINT_GLI, mask: [0, 0, 0, 0] },
    [Format.RGBA8_SRGB_PACK32]: { blockSize: 4, blockExtent: [1, 1, 1], component: 4, swizzles: [Swizzle.BLUE, Swizzle.GREEN, Swizzle.RED, Swizzle.ALPHA], flags: Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT | Cap.COLORSPACE_SRGB_BIT | Cap.BIT | Cap.PACKED32_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.R8G8B8A8_PACK_SRGB_GLI, mask: [0x00FF0000, 0x0000FF00, 0x000000FF, 0xFF000000] },

    [Format.RGB10A2_UNORM_PACK32]: { blockSize: 4, blockExtent: [1, 1, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ONE], flags: Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT | Cap.PACKED32_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.R10G10B10A2_UNORM, mask: [0x000003FF, 0x000FFC00, 0x3FF00000, 0xC0000000] },
    [Format.RGB10A2_SNORM_PACK32]: { blockSize: 4, blockExtent: [1, 1, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ONE], flags: Cap.NORMALIZED_BIT | Cap.SIGNED_BIT | Cap.PACKED32_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.R10G10B10A2_SNORM_GLI, mask: [0x000003FF, 0x000FFC00, 0x3FF00000, 0xC0000000] },
    [Format.RGB10A2_USCALED_PACK32]: { blockSize: 4, blockExtent: [1, 1, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ONE], flags: Cap.SCALED_BIT | Cap.UNSIGNED_BIT | Cap.PACKED32_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.R10G10B10A2_USCALED_GLI, mask: [0x000003FF, 0x000FFC00, 0x3FF00000, 0xC0000000] },
    [Format.RGB10A2_SSCALED_PACK32]: { blockSize: 4, blockExtent: [1, 1, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ONE], flags: Cap.SCALED_BIT | Cap.SIGNED_BIT | Cap.PACKED32_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.R10G10B10A2_SSCALED_GLI, mask: [0x000003FF, 0x000FFC00, 0x3FF00000, 0xC0000000] },
    [Format.RGB10A2_UINT_PACK32]: { blockSize: 4, blockExtent: [1, 1, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ONE], flags: Cap.INTEGER_BIT | Cap.UNSIGNED_BIT | Cap.PACKED32_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.R10G10B10A2_UINT, mask: [0x000003FF, 0x000FFC00, 0x3FF00000, 0xC0000000] },
    [Format.RGB10A2_SINT_PACK32]: { blockSize: 4, blockExtent: [1, 1, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ONE], flags: Cap.INTEGER_BIT | Cap.SIGNED_BIT | Cap.PACKED32_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.R10G10B10A2_SINT_GLI, mask: [0x000003FF, 0x000FFC00, 0x3FF00000, 0xC0000000] },

    [Format.BGR10A2_UNORM_PACK32]: { blockSize: 4, blockExtent: [1, 1, 1], component: 4, swizzles: [Swizzle.BLUE, Swizzle.GREEN, Swizzle.RED, Swizzle.ONE], flags: Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT | Cap.PACKED32_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.B10G10R10A2_UNORM_GLI, mask: [0x3FF00000, 0x000FFC00, 0x000003FF, 0xC0000000] },
    [Format.BGR10A2_SNORM_PACK32]: { blockSize: 4, blockExtent: [1, 1, 1], component: 4, swizzles: [Swizzle.BLUE, Swizzle.GREEN, Swizzle.RED, Swizzle.ONE], flags: Cap.NORMALIZED_BIT | Cap.SIGNED_BIT | Cap.PACKED32_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.B10G10R10A2_SNORM_GLI, mask: [0x3FF00000, 0x000FFC00, 0x000003FF, 0xC0000000] },
    [Format.BGR10A2_USCALED_PACK32]: { blockSize: 4, blockExtent: [1, 1, 1], component: 4, swizzles: [Swizzle.BLUE, Swizzle.GREEN, Swizzle.RED, Swizzle.ONE], flags: Cap.SCALED_BIT | Cap.UNSIGNED_BIT | Cap.PACKED32_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.B10G10R10A2_USCALED_GLI, mask: [0x3FF00000, 0x000FFC00, 0x000003FF, 0xC0000000] },
    [Format.BGR10A2_SSCALED_PACK32]: { blockSize: 4, blockExtent: [1, 1, 1], component: 4, swizzles: [Swizzle.BLUE, Swizzle.GREEN, Swizzle.RED, Swizzle.ONE], flags: Cap.SCALED_BIT | Cap.SIGNED_BIT | Cap.PACKED32_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.B10G10R10A2_SSCALED_GLI, mask: [0x3FF00000, 0x000FFC00, 0x000003FF, 0xC0000000] },
    [Format.BGR10A2_UINT_PACK32]: { blockSize: 4, blockExtent: [1, 1, 1], component: 4, swizzles: [Swizzle.BLUE, Swizzle.GREEN, Swizzle.RED, Swizzle.ONE], flags: Cap.INTEGER_BIT | Cap.UNSIGNED_BIT | Cap.PACKED32_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.B10G10R10A2_UINT_GLI, mask: [0x3FF00000, 0x000FFC00, 0x000003FF, 0xC0000000] },
    [Format.BGR10A2_SINT_PACK32]: { blockSize: 4, blockExtent: [1, 1, 1], component: 4, swizzles: [Swizzle.BLUE, Swizzle.GREEN, Swizzle.RED, Swizzle.ONE], flags: Cap.INTEGER_BIT | Cap.SIGNED_BIT | Cap.PACKED32_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.B10G10R10A2_SINT_GLI, mask: [0x3FF00000, 0x000FFC00, 0x000003FF, 0xC0000000] },

    [Format.R16_UNORM_PACK16]: { blockSize: 2, blockExtent: [1, 1, 1], component: 1, swizzles: [Swizzle.RED, Swizzle.ZERO, Swizzle.ZERO, Swizzle.ONE], flags: Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.R16_UNORM, mask: [0x0000FFFF, 0x00000000, 0x00000000, 0x00000000] },
    [Format.R16_SNORM_PACK16]: { blockSize: 2, blockExtent: [1, 1, 1], component: 1, swizzles: [Swizzle.RED, Swizzle.ZERO, Swizzle.ZERO, Swizzle.ONE], flags: Cap.NORMALIZED_BIT | Cap.SIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.R16_SNORM, mask: [0x0000FFFF, 0x00000000, 0x00000000, 0x00000000] },
    [Format.R16_USCALED_PACK16]: { blockSize: 2, blockExtent: [1, 1, 1], component: 1, swizzles: [Swizzle.RED, Swizzle.ZERO, Swizzle.ZERO, Swizzle.ONE], flags: Cap.SCALED_BIT | Cap.UNSIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.R16_USCALED_GLI, mask: [0x0000FFFF, 0x00000000, 0x00000000, 0x00000000] },
    [Format.R16_SSCALED_PACK16]: { blockSize: 2, blockExtent: [1, 1, 1], component: 1, swizzles: [Swizzle.RED, Swizzle.ZERO, Swizzle.ZERO, Swizzle.ONE], flags: Cap.SCALED_BIT | Cap.SIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.R16_SSCALED_GLI, mask: [0x0000FFFF, 0x00000000, 0x00000000, 0x00000000] },
    [Format.R16_UINT_PACK16]: { blockSize: 2, blockExtent: [1, 1, 1], component: 1, swizzles: [Swizzle.RED, Swizzle.ZERO, Swizzle.ZERO, Swizzle.ONE], flags: Cap.INTEGER_BIT | Cap.UNSIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.R16_UINT, mask: [0x0000FFFF, 0x00000000, 0x00000000, 0x00000000] },
    [Format.R16_SINT_PACK16]: { blockSize: 2, blockExtent: [1, 1, 1], component: 1, swizzles: [Swizzle.RED, Swizzle.ZERO, Swizzle.ZERO, Swizzle.ONE], flags: Cap.INTEGER_BIT | Cap.SIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.R16_SINT, mask: [0x0000FFFF, 0x00000000, 0x00000000, 0x00000000] },
    [Format.R16_SFLOAT_PACK16]: { blockSize: 2, blockExtent: [1, 1, 1], component: 1, swizzles: [Swizzle.RED, Swizzle.ZERO, Swizzle.ZERO, Swizzle.ONE], flags: Cap.FLOAT_BIT | Cap.SIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.R16F, dxgiFormat: DxgiFormatDds.R16_FLOAT, mask: [0x0000FFFF, 0x00000000, 0x00000000, 0x00000000] },

    [Format.RG16_UNORM_PACK16]: { blockSize: 4, blockExtent: [1, 1, 1], component: 2, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.ZERO, Swizzle.ONE], flags: Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.G16R16, dxgiFormat: DxgiFormatDds.R16G16_UNORM, mask: [0x0000FFFF, 0xFFFF0000, 0x00000000, 0x00000000] },
    [Format.RG16_SNORM_PACK16]: { blockSize: 4, blockExtent: [1, 1, 1], component: 2, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.ZERO, Swizzle.ONE], flags: Cap.NORMALIZED_BIT | Cap.SIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.R16G16_SNORM, mask: [0x0000FFFF, 0xFFFF0000, 0x00000000, 0x00000000] },
    [Format.RG16_USCALED_PACK16]: { blockSize: 4, blockExtent: [1, 1, 1], component: 2, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.ZERO, Swizzle.ONE], flags: Cap.SCALED_BIT | Cap.UNSIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.R16G16_USCALED_GLI, mask: [0x0000FFFF, 0xFFFF0000, 0x00000000, 0x00000000] },
    [Format.RG16_SSCALED_PACK16]: { blockSize: 4, blockExtent: [1, 1, 1], component: 2, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.ZERO, Swizzle.ONE], flags: Cap.SCALED_BIT | Cap.SIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.R16G16_SSCALED_GLI, mask: [0x0000FFFF, 0xFFFF0000, 0x00000000, 0x00000000] },
    [Format.RG16_UINT_PACK16]: { blockSize: 4, blockExtent: [1, 1, 1], component: 2, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.ZERO, Swizzle.ONE], flags: Cap.INTEGER_BIT | Cap.UNSIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.R16G16_UINT, mask: [0x0000FFFF, 0xFFFF0000, 0x00000000, 0x00000000] },
    [Format.RG16_SINT_PACK16]: { blockSize: 4, blockExtent: [1, 1, 1], component: 2, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.ZERO, Swizzle.ONE], flags: Cap.INTEGER_BIT | Cap.SIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.R16G16_SINT, mask: [0x0000FFFF, 0xFFFF0000, 0x00000000, 0x00000000] },
    [Format.RG16_SFLOAT_PACK16]: { blockSize: 4, blockExtent: [1, 1, 1], component: 2, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.ZERO, Swizzle.ONE], flags: Cap.FLOAT_BIT | Cap.SIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.G16R16F, dxgiFormat: DxgiFormatDds.R16G16_FLOAT, mask: [0x0000FFFF, 0xFFFF0000, 0x00000000, 0x00000000] },

    [Format.RGB16_UNORM_PACK16]: { blockSize: 6, blockExtent: [1, 1, 1], component: 3, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ONE], flags: Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.R16G16B16_UNORM_GLI, mask: [0, 0, 0, 0] },
    [Format.RGB16_SNORM_PACK16]: { blockSize: 6, blockExtent: [1, 1, 1], component: 3, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ONE], flags: Cap.NORMALIZED_BIT | Cap.SIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.R16G16B16_SNORM_GLI, mask: [0, 0, 0, 0] },
    [Format.RGB16_USCALED_PACK16]: { blockSize: 6, blockExtent: [1, 1, 1], component: 3, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ONE], flags: Cap.SCALED_BIT | Cap.UNSIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.R16G16B16_USCALED_GLI, mask: [0, 0, 0, 0] },
    [Format.RGB16_SSCALED_PACK16]: { blockSize: 6, blockExtent: [1, 1, 1], component: 3, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ONE], flags: Cap.SCALED_BIT | Cap.SIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.R16G16B16_SSCALED_GLI, mask: [0, 0, 0, 0] },
    [Format.RGB16_UINT_PACK16]: { blockSize: 6, blockExtent: [1, 1, 1], component: 3, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ONE], flags: Cap.INTEGER_BIT | Cap.UNSIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.R16G16B16_UINT_GLI, mask: [0, 0, 0, 0] },
    [Format.RGB16_SINT_PACK16]: { blockSize: 6, blockExtent: [1, 1, 1], component: 3, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ONE], flags: Cap.INTEGER_BIT | Cap.SIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.R16G16B16_SINT_GLI, mask: [0, 0, 0, 0] },
    [Format.RGB16_SFLOAT_PACK16]: { blockSize: 6, blockExtent: [1, 1, 1], component: 3, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ONE], flags: Cap.FLOAT_BIT | Cap.SIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.R16G16B16_FLOAT_GLI, mask: [0, 0, 0, 0] },

    [Format.RGBA16_UNORM_PACK16]: { blockSize: 8, blockExtent: [1, 1, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.A16B16G16R16, dxgiFormat: DxgiFormatDds.R16G16B16A16_UNORM, mask: [0, 0, 0, 0] },
    [Format.RGBA16_SNORM_PACK16]: { blockSize: 8, blockExtent: [1, 1, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.NORMALIZED_BIT | Cap.SIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.R16G16B16A16_SNORM, mask: [0, 0, 0, 0] },
    [Format.RGBA16_USCALED_PACK16]: { blockSize: 8, blockExtent: [1, 1, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.SCALED_BIT | Cap.UNSIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.R16G16B16A16_USCALED_GLI, mask: [0, 0, 0, 0] },
    [Format.RGBA16_SSCALED_PACK16]: { blockSize: 8, blockExtent: [1, 1, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.SCALED_BIT | Cap.SIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.R16G16B16A16_SSCALED_GLI, mask: [0, 0, 0, 0] },
    [Format.RGBA16_UINT_PACK16]: { blockSize: 8, blockExtent: [1, 1, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.INTEGER_BIT | Cap.UNSIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.R16G16B16A16_UINT, mask: [0, 0, 0, 0] },
    [Format.RGBA16_SINT_PACK16]: { blockSize: 8, blockExtent: [1, 1, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.INTEGER_BIT | Cap.SIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.R16G16B16A16_SINT, mask: [0, 0, 0, 0] },
    [Format.RGBA16_SFLOAT_PACK16]: { blockSize: 8, blockExtent: [1, 1, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.FLOAT_BIT | Cap.SIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.A16B16G16R16F, dxgiFormat: DxgiFormatDds.R16G16B16A16_FLOAT, mask: [0, 0, 0, 0] },

    [Format.R32_UINT_PACK32]: { blockSize: 4, blockExtent: [1, 1, 1], component: 1, swizzles: [Swizzle.RED, Swizzle.ZERO, Swizzle.ZERO, Swizzle.ONE], flags: Cap.INTEGER_BIT | Cap.UNSIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.R32_UINT, mask: [0, 0, 0, 0] },
    [Format.R32_SINT_PACK32]: { blockSize: 4, blockExtent: [1, 1, 1], component: 1, swizzles: [Swizzle.RED, Swizzle.ZERO, Swizzle.ZERO, Swizzle.ONE], flags: Cap.INTEGER_BIT | Cap.SIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.R32_SINT, mask: [0, 0, 0, 0] },
    [Format.R32_SFLOAT_PACK32]: { blockSize: 4, blockExtent: [1, 1, 1], component: 1, swizzles: [Swizzle.RED, Swizzle.ZERO, Swizzle.ZERO, Swizzle.ONE], flags: Cap.FLOAT_BIT | Cap.SIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.R32F, dxgiFormat: DxgiFormatDds.R32_FLOAT, mask: [0xFFFFFFFF, 0x0000000, 0x0000000, 0x0000000] },

    [Format.RG32_UINT_PACK32]: { blockSize: 8, blockExtent: [1, 1, 1], component: 2, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.ZERO, Swizzle.ONE], flags: Cap.INTEGER_BIT | Cap.UNSIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.R32G32_UINT, mask: [0, 0, 0, 0] },
    [Format.RG32_SINT_PACK32]: { blockSize: 8, blockExtent: [1, 1, 1], component: 2, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.ZERO, Swizzle.ONE], flags: Cap.INTEGER_BIT | Cap.SIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.R32G32_SINT, mask: [0, 0, 0, 0] },
    [Format.RG32_SFLOAT_PACK32]: { blockSize: 8, blockExtent: [1, 1, 1], component: 2, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.ZERO, Swizzle.ONE], flags: Cap.FLOAT_BIT | Cap.SIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.G32R32F, dxgiFormat: DxgiFormatDds.R32G32_FLOAT, mask: [0, 0, 0, 0] },

    [Format.RGB32_UINT_PACK32]: { blockSize: 12, blockExtent: [1, 1, 1], component: 3, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ONE], flags: Cap.INTEGER_BIT | Cap.UNSIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.R32G32B32_UINT, mask: [0, 0, 0, 0] },
    [Format.RGB32_SINT_PACK32]: { blockSize: 12, blockExtent: [1, 1, 1], component: 3, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ONE], flags: Cap.INTEGER_BIT | Cap.SIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.R32G32B32_SINT, mask: [0, 0, 0, 0] },
    [Format.RGB32_SFLOAT_PACK32]: { blockSize: 12, blockExtent: [1, 1, 1], component: 3, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ONE], flags: Cap.FLOAT_BIT | Cap.SIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.R32G32B32_FLOAT, mask: [0, 0, 0, 0] },

    [Format.RGBA32_UINT_PACK32]: { blockSize: 16, blockExtent: [1, 1, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.INTEGER_BIT | Cap.UNSIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.R32G32B32A32_UINT, mask: [0, 0, 0, 0] },
    [Format.RGBA32_SINT_PACK32]: { blockSize: 16, blockExtent: [1, 1, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.INTEGER_BIT | Cap.SIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.R32G32B32A32_SINT, mask: [0, 0, 0, 0] },
    [Format.RGBA32_SFLOAT_PACK32]: { blockSize: 16, blockExtent: [1, 1, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.FLOAT_BIT | Cap.SIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.A32B32G32R32F, dxgiFormat: DxgiFormatDds.R32G32B32A32_FLOAT, mask: [0, 0, 0, 0] },

    [Format.R64_UINT_PACK64]: { blockSize: 8, blockExtent: [1, 1, 1], component: 1, swizzles: [Swizzle.RED, Swizzle.ZERO, Swizzle.ZERO, Swizzle.ONE], flags: Cap.INTEGER_BIT | Cap.UNSIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.R64_UINT_GLI, mask: [0, 0, 0, 0] },
    [Format.R64_SINT_PACK64]: { blockSize: 8, blockExtent: [1, 1, 1], component: 1, swizzles: [Swizzle.RED, Swizzle.ZERO, Swizzle.ZERO, Swizzle.ONE], flags: Cap.INTEGER_BIT | Cap.SIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.R64_SINT_GLI, mask: [0, 0, 0, 0] },
    [Format.R64_SFLOAT_PACK64]: { blockSize: 8, blockExtent: [1, 1, 1], component: 1, swizzles: [Swizzle.RED, Swizzle.ZERO, Swizzle.ZERO, Swizzle.ONE], flags: Cap.FLOAT_BIT | Cap.SIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.R64_FLOAT_GLI, mask: [0, 0, 0, 0] },

    [Format.RG64_UINT_PACK64]: { blockSize: 16, blockExtent: [1, 1, 1], component: 2, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.ZERO, Swizzle.ONE], flags: Cap.INTEGER_BIT | Cap.UNSIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.R64G64_UINT_GLI, mask: [0, 0, 0, 0] },
    [Format.RG64_SINT_PACK64]: { blockSize: 16, blockExtent: [1, 1, 1], component: 2, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.ZERO, Swizzle.ONE], flags: Cap.INTEGER_BIT | Cap.SIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.R64G64_SINT_GLI, mask: [0, 0, 0, 0] },
    [Format.RG64_SFLOAT_PACK64]: { blockSize: 16, blockExtent: [1, 1, 1], component: 2, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.ZERO, Swizzle.ONE], flags: Cap.FLOAT_BIT | Cap.SIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.R64G64_FLOAT_GLI, mask: [0, 0, 0, 0] },

    [Format.RGB64_UINT_PACK64]: { blockSize: 24, blockExtent: [1, 1, 1], component: 3, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ONE], flags: Cap.INTEGER_BIT | Cap.UNSIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.R64G64B64_UINT_GLI, mask: [0, 0, 0, 0] },
    [Format.RGB64_SINT_PACK64]: { blockSize: 24, blockExtent: [1, 1, 1], component: 3, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ONE], flags: Cap.INTEGER_BIT | Cap.SIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.R64G64B64_SINT_GLI, mask: [0, 0, 0, 0] },
    [Format.RGB64_SFLOAT_PACK64]: { blockSize: 24, blockExtent: [1, 1, 1], component: 3, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ONE], flags: Cap.FLOAT_BIT | Cap.SIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.R64G64B64_FLOAT_GLI, mask: [0, 0, 0, 0] },

    [Format.RGBA64_UINT_PACK64]: { blockSize: 32, blockExtent: [1, 1, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.INTEGER_BIT | Cap.UNSIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.R64G64B64A64_UINT_GLI, mask: [0, 0, 0, 0] },
    [Format.RGBA64_SINT_PACK64]: { blockSize: 32, blockExtent: [1, 1, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.INTEGER_BIT | Cap.SIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.R64G64B64A64_SINT_GLI, mask: [0, 0, 0, 0] },
    [Format.RGBA64_SFLOAT_PACK64]: { blockSize: 32, blockExtent: [1, 1, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.FLOAT_BIT | Cap.SIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.R64G64B64A64_FLOAT_GLI, mask: [0, 0, 0, 0] },

    [Format.RG11B10_UFLOAT_PACK32]: { blockSize: 4, blockExtent: [1, 1, 1], component: 3, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ONE], flags: Cap.PACKED32_BIT | Cap.FLOAT_BIT | Cap.SIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.R11G11B10_FLOAT, mask: [0, 0, 0, 0] },
    [Format.RGB9E5_UFLOAT_PACK32]: { blockSize: 4, blockExtent: [1, 1, 1], component: 3, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ONE], flags: Cap.PACKED32_BIT | Cap.FLOAT_BIT | Cap.UNSIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.R9G9B9E5_SHAREDEXP, mask: [0, 0, 0, 0] },

    [Format.D16_UNORM_PACK16]: { blockSize: 2, blockExtent: [1, 1, 1], component: 1, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.DEPTH_BIT | Cap.INTEGER_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.D16_UNORM, mask: [0, 0, 0, 0] },
    [Format.D24_UNORM_PACK32]: { blockSize: 4, blockExtent: [1, 1, 1], component: 1, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.DEPTH_BIT | Cap.INTEGER_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.D24_UNORM_GLI, mask: [0, 0, 0, 0] },
    [Format.D32_SFLOAT_PACK32]: { blockSize: 4, blockExtent: [1, 1, 1], component: 1, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.DEPTH_BIT | Cap.FLOAT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.D32_FLOAT, mask: [0, 0, 0, 0] },
    [Format.S8_UINT_PACK8]: { blockSize: 1, blockExtent: [1, 1, 1], component: 1, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.DEPTH_BIT | Cap.STENCIL_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.S8_UINT_GLI, mask: [0, 0, 0, 0] },
    [Format.D16_UNORM_S8_UINT_PACK32]: { blockSize: 3, blockExtent: [1, 1, 1], component: 2, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.DEPTH_BIT | Cap.INTEGER_BIT | Cap.STENCIL_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.D16_UNORM_S8_UINT_GLI, mask: [0, 0, 0, 0] },
    [Format.D24_UNORM_S8_UINT_PACK32]: { blockSize: 4, blockExtent: [1, 1, 1], component: 2, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.DEPTH_BIT | Cap.INTEGER_BIT | Cap.STENCIL_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.D24_UNORM_S8_UINT, mask: [0, 0, 0, 0] },
    [Format.D32_SFLOAT_S8_UINT_PACK64]: { blockSize: 5, blockExtent: [1, 1, 1], component: 2, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.DEPTH_BIT | Cap.FLOAT_BIT | Cap.STENCIL_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.D32_FLOAT_S8X24_UINT, mask: [0, 0, 0, 0] },

    [Format.RGB_DXT1_UNORM_BLOCK8]: { blockSize: 8, blockExtent: [4, 4, 1], component: 3, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ONE], flags: Cap.COMPRESSED_BIT | Cap.DECODER_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.BC1_RGB_UNORM_GLI, mask: [0, 0, 0, 0] },
    [Format.RGB_DXT1_SRGB_BLOCK8]: { blockSize: 8, blockExtent: [4, 4, 1], component: 3, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ONE], flags: Cap.COMPRESSED_BIT | Cap.DECODER_BIT | Cap.COLORSPACE_SRGB_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.BC1_RGB_SRGB_GLI, mask: [0, 0, 0, 0] },
    [Format.RGBA_DXT1_UNORM_BLOCK8]: { blockSize: 8, blockExtent: [4, 4, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.COMPRESSED_BIT | Cap.DECODER_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DXT1, dxgiFormat: DxgiFormatDds.BC1_UNORM, mask: [0, 0, 0, 0] },
    [Format.RGBA_DXT1_SRGB_BLOCK8]: { blockSize: 8, blockExtent: [4, 4, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.COMPRESSED_BIT | Cap.DECODER_BIT | Cap.COLORSPACE_SRGB_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.BC1_UNORM_SRGB, mask: [0, 0, 0, 0] },
    [Format.RGBA_DXT3_UNORM_BLOCK16]: { blockSize: 16, blockExtent: [4, 4, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.COMPRESSED_BIT | Cap.DECODER_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DXT3, dxgiFormat: DxgiFormatDds.BC2_UNORM, mask: [0, 0, 0, 0] },
    [Format.RGBA_DXT3_SRGB_BLOCK16]: { blockSize: 16, blockExtent: [4, 4, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.COMPRESSED_BIT | Cap.DECODER_BIT | Cap.COLORSPACE_SRGB_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.BC2_UNORM_SRGB, mask: [0, 0, 0, 0] },
    [Format.RGBA_DXT5_UNORM_BLOCK16]: { blockSize: 16, blockExtent: [4, 4, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.COMPRESSED_BIT | Cap.DECODER_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DXT5, dxgiFormat: DxgiFormatDds.BC3_UNORM, mask: [0, 0, 0, 0] },
    [Format.RGBA_DXT5_SRGB_BLOCK16]: { blockSize: 16, blockExtent: [4, 4, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.COMPRESSED_BIT | Cap.DECODER_BIT | Cap.COLORSPACE_SRGB_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.BC3_UNORM_SRGB, mask: [0, 0, 0, 0] },
    [Format.R_ATI1N_UNORM_BLOCK8]: { blockSize: 8, blockExtent: [4, 4, 1], component: 1, swizzles: [Swizzle.RED, Swizzle.ZERO, Swizzle.ZERO, Swizzle.ONE], flags: Cap.COMPRESSED_BIT | Cap.DECODER_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.ATI1, dxgiFormat: DxgiFormatDds.BC4_UNORM, mask: [0, 0, 0, 0] },
    [Format.R_ATI1N_SNORM_BLOCK8]: { blockSize: 8, blockExtent: [4, 4, 1], component: 1, swizzles: [Swizzle.RED, Swizzle.ZERO, Swizzle.ZERO, Swizzle.ONE], flags: Cap.COMPRESSED_BIT | Cap.DECODER_BIT | Cap.NORMALIZED_BIT | Cap.SIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.AT1N, dxgiFormat: DxgiFormatDds.BC4_SNORM, mask: [0, 0, 0, 0] },
    [Format.RG_ATI2N_UNORM_BLOCK16]: { blockSize: 16, blockExtent: [4, 4, 1], component: 2, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.ZERO, Swizzle.ONE], flags: Cap.COMPRESSED_BIT | Cap.DECODER_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.ATI2, dxgiFormat: DxgiFormatDds.BC5_UNORM, mask: [0, 0, 0, 0] },
    [Format.RG_ATI2N_SNORM_BLOCK16]: { blockSize: 16, blockExtent: [4, 4, 1], component: 2, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.ZERO, Swizzle.ONE], flags: Cap.COMPRESSED_BIT | Cap.DECODER_BIT | Cap.NORMALIZED_BIT | Cap.SIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.AT2N, dxgiFormat: DxgiFormatDds.BC5_SNORM, mask: [0, 0, 0, 0] },

    [Format.RGB_BP_UFLOAT_BLOCK16]: { blockSize: 16, blockExtent: [4, 4, 1], component: 3, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ONE], flags: Cap.COMPRESSED_BIT | Cap.FLOAT_BIT | Cap.UNSIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.BC6H_UF16, mask: [0, 0, 0, 0] },
    [Format.RGB_BP_SFLOAT_BLOCK16]: { blockSize: 16, blockExtent: [4, 4, 1], component: 3, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ONE], flags: Cap.COMPRESSED_BIT | Cap.FLOAT_BIT | Cap.SIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.BC6H_SF16, mask: [0, 0, 0, 0] },
    [Format.RGBA_BP_UNORM_BLOCK16]: { blockSize: 16, blockExtent: [4, 4, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.COMPRESSED_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.BC7_UNORM, mask: [0, 0, 0, 0] },
    [Format.RGBA_BP_SRGB_BLOCK16]: { blockSize: 16, blockExtent: [4, 4, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.COMPRESSED_BIT | Cap.COLORSPACE_SRGB_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.BC7_UNORM_SRGB, mask: [0, 0, 0, 0] },

    [Format.RGB_ETC2_UNORM_BLOCK8]: { blockSize: 8, blockExtent: [4, 4, 1], component: 3, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ONE], flags: Cap.COMPRESSED_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.RGB_ETC2_UNORM_GLI, mask: [0, 0, 0, 0] },
    [Format.RGB_ETC2_SRGB_BLOCK8]: { blockSize: 8, blockExtent: [4, 4, 1], component: 3, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ONE], flags: Cap.COMPRESSED_BIT | Cap.COLORSPACE_SRGB_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.RGB_ETC2_SRGB_GLI, mask: [0, 0, 0, 0] },
    [Format.RGBA_ETC2_UNORM_BLOCK8]: { blockSize: 8, blockExtent: [4, 4, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.COMPRESSED_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.RGBA_ETC2_A1_UNORM_GLI, mask: [0, 0, 0, 0] },
    [Format.RGBA_ETC2_SRGB_BLOCK8]: { blockSize: 8, blockExtent: [4, 4, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.COMPRESSED_BIT | Cap.COLORSPACE_SRGB_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.RGBA_ETC2_A1_SRGB_GLI, mask: [0, 0, 0, 0] },
    [Format.RGBA_ETC2_UNORM_BLOCK16]: { blockSize: 16, blockExtent: [4, 4, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.COMPRESSED_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.RGBA_ETC2_UNORM_GLI, mask: [0, 0, 0, 0] },
    [Format.RGBA_ETC2_SRGB_BLOCK16]: { blockSize: 16, blockExtent: [4, 4, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.COMPRESSED_BIT | Cap.COLORSPACE_SRGB_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.RGBA_ETC2_SRGB_GLI, mask: [0, 0, 0, 0] },
    [Format.R_EAC_UNORM_BLOCK8]: { blockSize: 8, blockExtent: [4, 4, 1], component: 1, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ONE], flags: Cap.COMPRESSED_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.R11_EAC_UNORM_GLI, mask: [0, 0, 0, 0] },
    [Format.R_EAC_SNORM_BLOCK8]: { blockSize: 8, blockExtent: [4, 4, 1], component: 1, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ONE], flags: Cap.COMPRESSED_BIT | Cap.NORMALIZED_BIT | Cap.SIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.R11_EAC_SNORM_GLI, mask: [0, 0, 0, 0] },
    [Format.RG_EAC_UNORM_BLOCK16]: { blockSize: 16, blockExtent: [4, 4, 1], component: 2, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.ZERO, Swizzle.ONE], flags: Cap.COMPRESSED_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.RG11_EAC_UNORM_GLI, mask: [0, 0, 0, 0] },
    [Format.RG_EAC_SNORM_BLOCK16]: { blockSize: 16, blockExtent: [4, 4, 1], component: 2, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.ZERO, Swizzle.ONE], flags: Cap.COMPRESSED_BIT | Cap.NORMALIZED_BIT | Cap.SIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.RG11_EAC_SNORM_GLI, mask: [0, 0, 0, 0] },

    [Format.RGBA_ASTC_4X4_UNORM_BLOCK16]: { blockSize: 16, blockExtent: [4, 4, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.COMPRESSED_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.ASTC_4X4_UNORM, mask: [0, 0, 0, 0] },
    [Format.RGBA_ASTC_4X4_SRGB_BLOCK16]: { blockSize: 16, blockExtent: [4, 4, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.COMPRESSED_BIT | Cap.COLORSPACE_SRGB_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.ASTC_4X4_UNORM_SRGB, mask: [0, 0, 0, 0] },
    [Format.RGBA_ASTC_5X4_UNORM_BLOCK16]: { blockSize: 16, blockExtent: [5, 4, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.COMPRESSED_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.ASTC_5X4_UNORM, mask: [0, 0, 0, 0] },
    [Format.RGBA_ASTC_5X4_SRGB_BLOCK16]: { blockSize: 16, blockExtent: [5, 4, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.COMPRESSED_BIT | Cap.COLORSPACE_SRGB_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.ASTC_5X4_UNORM_SRGB, mask: [0, 0, 0, 0] },
    [Format.RGBA_ASTC_5X5_UNORM_BLOCK16]: { blockSize: 16, blockExtent: [5, 5, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.COMPRESSED_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.ASTC_5X5_UNORM, mask: [0, 0, 0, 0] },
    [Format.RGBA_ASTC_5X5_SRGB_BLOCK16]: { blockSize: 16, blockExtent: [5, 5, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.COMPRESSED_BIT | Cap.COLORSPACE_SRGB_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.ASTC_5X5_UNORM_SRGB, mask: [0, 0, 0, 0] },
    [Format.RGBA_ASTC_6X5_UNORM_BLOCK16]: { blockSize: 16, blockExtent: [6, 5, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.COMPRESSED_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.ASTC_6X5_UNORM, mask: [0, 0, 0, 0] },
    [Format.RGBA_ASTC_6X5_SRGB_BLOCK16]: { blockSize: 16, blockExtent: [6, 5, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.COMPRESSED_BIT | Cap.COLORSPACE_SRGB_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.ASTC_6X5_UNORM_SRGB, mask: [0, 0, 0, 0] },
    [Format.RGBA_ASTC_6X6_UNORM_BLOCK16]: { blockSize: 16, blockExtent: [6, 6, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.COMPRESSED_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.ASTC_6X6_UNORM, mask: [0, 0, 0, 0] },
    [Format.RGBA_ASTC_6X6_SRGB_BLOCK16]: { blockSize: 16, blockExtent: [6, 6, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.COMPRESSED_BIT | Cap.COLORSPACE_SRGB_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.ASTC_6X6_UNORM_SRGB, mask: [0, 0, 0, 0] },
    [Format.RGBA_ASTC_8X5_UNORM_BLOCK16]: { blockSize: 16, blockExtent: [8, 5, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.COMPRESSED_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.ASTC_8X5_UNORM, mask: [0, 0, 0, 0] },
    [Format.RGBA_ASTC_8X5_SRGB_BLOCK16]: { blockSize: 16, blockExtent: [8, 5, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.COMPRESSED_BIT | Cap.COLORSPACE_SRGB_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.ASTC_8X5_UNORM_SRGB, mask: [0, 0, 0, 0] },
    [Format.RGBA_ASTC_8X6_UNORM_BLOCK16]: { blockSize: 16, blockExtent: [8, 6, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.COMPRESSED_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.ASTC_8X6_UNORM, mask: [0, 0, 0, 0] },
    [Format.RGBA_ASTC_8X6_SRGB_BLOCK16]: { blockSize: 16, blockExtent: [8, 6, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.COMPRESSED_BIT | Cap.COLORSPACE_SRGB_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.ASTC_8X6_UNORM_SRGB, mask: [0, 0, 0, 0] },
    [Format.RGBA_ASTC_8X8_UNORM_BLOCK16]: { blockSize: 16, blockExtent: [8, 8, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.COMPRESSED_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.ASTC_8X8_UNORM, mask: [0, 0, 0, 0] },
    [Format.RGBA_ASTC_8X8_SRGB_BLOCK16]: { blockSize: 16, blockExtent: [8, 8, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.COMPRESSED_BIT | Cap.COLORSPACE_SRGB_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.ASTC_8X8_UNORM_SRGB, mask: [0, 0, 0, 0] },
    [Format.RGBA_ASTC_10X5_UNORM_BLOCK16]: { blockSize: 16, blockExtent: [10, 5, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.COMPRESSED_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.ASTC_10X5_UNORM, mask: [0, 0, 0, 0] },
    [Format.RGBA_ASTC_10X5_SRGB_BLOCK16]: { blockSize: 16, blockExtent: [10, 5, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.COMPRESSED_BIT | Cap.COLORSPACE_SRGB_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.ASTC_10X5_UNORM_SRGB, mask: [0, 0, 0, 0] },
    [Format.RGBA_ASTC_10X6_UNORM_BLOCK16]: { blockSize: 16, blockExtent: [10, 6, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.COMPRESSED_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.ASTC_10X6_UNORM, mask: [0, 0, 0, 0] },
    [Format.RGBA_ASTC_10X6_SRGB_BLOCK16]: { blockSize: 16, blockExtent: [10, 6, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.COMPRESSED_BIT | Cap.COLORSPACE_SRGB_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.ASTC_10X6_UNORM_SRGB, mask: [0, 0, 0, 0] },
    [Format.RGBA_ASTC_10X8_UNORM_BLOCK16]: { blockSize: 16, blockExtent: [10, 8, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.COMPRESSED_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.ASTC_10X8_UNORM, mask: [0, 0, 0, 0] },
    [Format.RGBA_ASTC_10X8_SRGB_BLOCK16]: { blockSize: 16, blockExtent: [10, 8, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.COMPRESSED_BIT | Cap.COLORSPACE_SRGB_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.ASTC_10X8_UNORM_SRGB, mask: [0, 0, 0, 0] },
    [Format.RGBA_ASTC_10X10_UNORM_BLOCK16]: { blockSize: 16, blockExtent: [10, 10, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.COMPRESSED_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.ASTC_10X10_UNORM_SRGB, mask: [0, 0, 0, 0] },
    [Format.RGBA_ASTC_10X10_SRGB_BLOCK16]: { blockSize: 16, blockExtent: [10, 10, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.COMPRESSED_BIT | Cap.COLORSPACE_SRGB_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.ASTC_10X10_UNORM, mask: [0, 0, 0, 0] },
    [Format.RGBA_ASTC_12X10_UNORM_BLOCK16]: { blockSize: 16, blockExtent: [12, 10, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.COMPRESSED_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.ASTC_12X10_UNORM, mask: [0, 0, 0, 0] },
    [Format.RGBA_ASTC_12X10_SRGB_BLOCK16]: { blockSize: 16, blockExtent: [12, 10, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.COMPRESSED_BIT | Cap.COLORSPACE_SRGB_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.ASTC_12X10_UNORM_SRGB, mask: [0, 0, 0, 0] },
    [Format.RGBA_ASTC_12X12_UNORM_BLOCK16]: { blockSize: 16, blockExtent: [12, 12, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.COMPRESSED_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.ASTC_12X12_UNORM, mask: [0, 0, 0, 0] },
    [Format.RGBA_ASTC_12X12_SRGB_BLOCK16]: { blockSize: 16, blockExtent: [12, 12, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.COMPRESSED_BIT | Cap.COLORSPACE_SRGB_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.ASTC_12X12_UNORM_SRGB, mask: [0, 0, 0, 0] },

    [Format.RGB_PVRTC1_8X8_UNORM_BLOCK32]: { blockSize: 32, blockExtent: [8, 8, 1], component: 3, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ONE], flags: Cap.COMPRESSED_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.POWERVR_4BPP, dxgiFormat: DxgiFormatGli.RGB_PVRTC1_8X8_UNORM_GLI, mask: [0, 0, 0, 0] },
    [Format.RGB_PVRTC1_8X8_SRGB_BLOCK32]: { blockSize: 32, blockExtent: [8, 8, 1], component: 3, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ONE], flags: Cap.COMPRESSED_BIT | Cap.COLORSPACE_SRGB_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.RGB_PVRTC1_8X8_SRGB_GLI, mask: [0, 0, 0, 0] },
    [Format.RGB_PVRTC1_16X8_UNORM_BLOCK32]: { blockSize: 32, blockExtent: [16, 8, 1], component: 3, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ONE], flags: Cap.COMPRESSED_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.POWERVR_2BPP, dxgiFormat: DxgiFormatGli.RGB_PVRTC1_16X8_UNORM_GLI, mask: [0, 0, 0, 0] },
    [Format.RGB_PVRTC1_16X8_SRGB_BLOCK32]: { blockSize: 32, blockExtent: [16, 8, 1], component: 3, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ONE], flags: Cap.COMPRESSED_BIT | Cap.COLORSPACE_SRGB_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.RGB_PVRTC1_16X8_SRGB_GLI, mask: [0, 0, 0, 0] },
    [Format.RGBA_PVRTC1_8X8_UNORM_BLOCK32]: { blockSize: 32, blockExtent: [8, 8, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.COMPRESSED_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.RGBA_PVRTC1_8X8_UNORM_GLI, mask: [0, 0, 0, 0] },
    [Format.RGBA_PVRTC1_8X8_SRGB_BLOCK32]: { blockSize: 32, blockExtent: [8, 8, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.COMPRESSED_BIT | Cap.COLORSPACE_SRGB_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.RGBA_PVRTC1_8X8_SRGB_GLI, mask: [0, 0, 0, 0] },
    [Format.RGBA_PVRTC1_16X8_UNORM_BLOCK32]: { blockSize: 32, blockExtent: [16, 8, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.COMPRESSED_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.RGBA_PVRTC1_16X8_UNORM_GLI, mask: [0, 0, 0, 0] },
    [Format.RGBA_PVRTC1_16X8_SRGB_BLOCK32]: { blockSize: 32, blockExtent: [16, 8, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.COMPRESSED_BIT | Cap.COLORSPACE_SRGB_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.RGBA_PVRTC1_16X8_SRGB_GLI, mask: [0, 0, 0, 0] },

    [Format.RGBA_PVRTC2_4X4_UNORM_BLOCK8]: { blockSize: 8, blockExtent: [4, 4, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.COMPRESSED_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.RGBA_PVRTC2_8X8_UNORM_GLI, mask: [0, 0, 0, 0] },
    [Format.RGBA_PVRTC2_4X4_SRGB_BLOCK8]: { blockSize: 8, blockExtent: [4, 4, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.COMPRESSED_BIT | Cap.COLORSPACE_SRGB_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.RGBA_PVRTC2_8X8_SRGB_GLI, mask: [0, 0, 0, 0] },
    [Format.RGBA_PVRTC2_8X4_UNORM_BLOCK8]: { blockSize: 8, blockExtent: [8, 4, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.COMPRESSED_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.RGBA_PVRTC2_16X8_UNORM_GLI, mask: [0, 0, 0, 0] },
    [Format.RGBA_PVRTC2_8X4_SRGB_BLOCK8]: { blockSize: 8, blockExtent: [8, 4, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.COMPRESSED_BIT | Cap.COLORSPACE_SRGB_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.RGBA_PVRTC2_16X8_SRGB_GLI, mask: [0, 0, 0, 0] },

    [Format.RGB_ETC_UNORM_BLOCK8]: { blockSize: 8, blockExtent: [4, 4, 1], component: 3, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ONE], flags: Cap.COMPRESSED_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.ETC, dxgiFormat: DxgiFormatGli.RGB_ETC_UNORM_GLI, mask: [0, 0, 0, 0] },
    [Format.RGB_ATC_UNORM_BLOCK8]: { blockSize: 8, blockExtent: [4, 4, 1], component: 3, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ONE], flags: Cap.COMPRESSED_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.ATC, dxgiFormat: DxgiFormatGli.RGB_ATC_UNORM_GLI, mask: [0, 0, 0, 0] },
    [Format.RGBA_ATCA_UNORM_BLOCK16]: { blockSize: 16, blockExtent: [4, 4, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.COMPRESSED_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.ATCA, dxgiFormat: DxgiFormatGli.RGBA_ATCA_UNORM_GLI, mask: [0, 0, 0, 0] },
    [Format.RGBA_ATCI_UNORM_BLOCK16]: { blockSize: 16, blockExtent: [4, 4, 1], component: 4, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ALPHA], flags: Cap.COMPRESSED_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.ATCI, dxgiFormat: DxgiFormatGli.RGBA_ATCI_UNORM_GLI, mask: [0, 0, 0, 0] },

    [Format.L8_UNORM_PACK8]: { blockSize: 1, blockExtent: [1, 1, 1], component: 1, swizzles: [Swizzle.RED, Swizzle.RED, Swizzle.RED, Swizzle.ONE], flags: Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT | Cap.LUMINANCE_ALPHA_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.LUMINANCE, d3dFormat: D3dFmt.L8, dxgiFormat: DxgiFormatGli.L8_UNORM_GLI, mask: [0x000000FF, 0x00000000, 0x00000000, 0x00000000] },
    [Format.A8_UNORM_PACK8]: { blockSize: 1, blockExtent: [1, 1, 1], component: 1, swizzles: [Swizzle.ZERO, Swizzle.ZERO, Swizzle.ZERO, Swizzle.RED], flags: Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT | Cap.LUMINANCE_ALPHA_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.ALPHA, d3dFormat: D3dFmt.A8, dxgiFormat: DxgiFormatGli.A8_UNORM_GLI, mask: [0x00000000, 0x00000000, 0x00000000, 0x000000FF] },
    [Format.LA8_UNORM_PACK8]: { blockSize: 2, blockExtent: [1, 1, 1], component: 2, swizzles: [Swizzle.RED, Swizzle.RED, Swizzle.RED, Swizzle.GREEN], flags: Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT | Cap.LUMINANCE_ALPHA_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.LUMINANCE_ALPHA, d3dFormat: D3dFmt.A8L8, dxgiFormat: DxgiFormatGli.LA8_UNORM_GLI, mask: [0x000000FF, 0x00000000, 0x00000000, 0x0000FF00] },
    [Format.L16_UNORM_PACK16]: { blockSize: 2, blockExtent: [1, 1, 1], component: 1, swizzles: [Swizzle.RED, Swizzle.RED, Swizzle.RED, Swizzle.ONE], flags: Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT | Cap.LUMINANCE_ALPHA_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.LUMINANCE, d3dFormat: D3dFmt.L16, dxgiFormat: DxgiFormatGli.L16_UNORM_GLI, mask: [0x0000FFFF, 0x00000000, 0x00000000, 0x00000000] },
    [Format.A16_UNORM_PACK16]: { blockSize: 2, blockExtent: [1, 1, 1], component: 1, swizzles: [Swizzle.ZERO, Swizzle.ZERO, Swizzle.ZERO, Swizzle.RED], flags: Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT | Cap.LUMINANCE_ALPHA_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.ALPHA, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.A16_UNORM_GLI, mask: [0x00000000, 0x00000000, 0x00000000, 0x0000FFFF] },
    [Format.LA16_UNORM_PACK16]: { blockSize: 4, blockExtent: [1, 1, 1], component: 2, swizzles: [Swizzle.RED, Swizzle.RED, Swizzle.RED, Swizzle.GREEN], flags: Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT | Cap.LUMINANCE_ALPHA_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.LUMINANCE_ALPHA, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.LA16_UNORM_GLI, mask: [0x0000FFFF, 0x00000000, 0x00000000, 0xFFFF0000] },

    [Format.BGR8_UNORM_PACK32]: { blockSize: 4, blockExtent: [1, 1, 1], component: 3, swizzles: [Swizzle.BLUE, Swizzle.GREEN, Swizzle.RED, Swizzle.ONE], flags: Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT | Cap.BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.B8G8R8X8_UNORM, mask: [0x00FF0000, 0x0000FF00, 0x000000FF, 0x00000000] },
    [Format.BGR8_SRGB_PACK32]: { blockSize: 4, blockExtent: [1, 1, 1], component: 3, swizzles: [Swizzle.BLUE, Swizzle.GREEN, Swizzle.RED, Swizzle.ONE], flags: Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT | Cap.BIT | Cap.COLORSPACE_SRGB_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.DX10, dxgiFormat: DxgiFormatDds.B8G8R8X8_UNORM_SRGB, mask: [0x00FF0000, 0x0000FF00, 0x000000FF, 0x00000000] },

    [Format.RG3B2_UNORM_PACK8]: { blockSize: 1, blockExtent: [1, 1, 1], component: 3, swizzles: [Swizzle.RED, Swizzle.GREEN, Swizzle.BLUE, Swizzle.ONE], flags: Cap.PACKED8_BIT | Cap.NORMALIZED_BIT | Cap.UNSIGNED_BIT | Cap.DDS_GLI_EXT_BIT, ddPixelFormat: Ddpf.FOURCC, d3dFormat: D3dFmt.GLI1, dxgiFormat: DxgiFormatGli.R3G3B2_UNORM_GLI, mask: [0x70, 0x38, 0xC0, 0x00] },
};

export namespace Format {
  export function info(format: Format) {
    return formatInfos[format];
  }

  export function find(fourCC: number, dxgiFormat?: number): Format {
    for (let i = Format.FIRST; i < Format.LAST; i++) {
      const info = formatInfos[i];
      if (dxgiFormat === undefined) {
        if (info.d3dFormat === fourCC) return i;
      } else {
        if (fourCC === D3dFmt.GLI1 && info.flags & Cap.DDS_GLI_EXT_BIT && info.dxgiFormat === dxgiFormat) return i;
        if (fourCC === D3dFmt.DX10 && !(info.flags & Cap.DDS_GLI_EXT_BIT) && info.dxgiFormat === dxgiFormat) return i;
      }
    }
    return Format.UNDEFINED;
  }

  /// Evaluate whether a format is compressed
  export function isCompressed(format: Format) {
    return !!(formatInfos[format].flags & Cap.COMPRESSED_BIT);
  }

  /// Evaluate whether a format is compressed with an S3TC algorithm.
  export function isS3tcCompressed(format: Format) {
    return format >= Format.RGB_DXT1_UNORM_BLOCK8 && format <= Format.RGBA_DXT5_SRGB_BLOCK16;
  }

  /// Evaluate whether a format stores sRGB color space values
  export function isSrgb(format: Format) {
    return !!(formatInfos[format].flags & Cap.COLORSPACE_SRGB_BIT);
  }

  /// Return the size in bytes of a block for a format.
  export function blockSize(format: Format) {
    return formatInfos[format].blockSize;
  }

  /// Return the dimensions in texels of the block for a format
  export function blockExtent(format: Format) {
    return formatInfos[format].blockExtent;
  }

  /// Return the number of components of a format
  export function componentCount(format: Format) {
    return formatInfos[format].component;
  }

  /// Evaluate whether a format is unsigned
  export function isUnsigned(format: Format) {
    return !!(formatInfos[format].flags & Cap.UNSIGNED_BIT);
  }

  /// Evaluate whether a format is signed
  export function isSigned(format: Format) {
    return !!(formatInfos[format].flags & Cap.SIGNED_BIT);
  }

  /// Evaluate whether the format is an integer format
  export function isInteger(format: Format) {
    return !!(formatInfos[format].flags & Cap.INTEGER_BIT);
  }

  /// Evaluate whether the format is a signed integer format
  export function isSignedInteger(format: Format) {
    return isInteger(format) && isSigned(format);
  }

  /// Evaluate whether the format is an unsigned integer format
  export function isUnsignedInteger(format: Format) {
    return isInteger(format) && isUnsigned(format);
  }

  /// Evaluate whether the format is an float format
  export function isFloat(format: Format) {
    return !!(formatInfos[format].flags & Cap.FLOAT_BIT);
  }

  /// Evaluate whether the format is normalized
  export function isNormalized(format: Format) {
    return !!(formatInfos[format].flags & Cap.NORMALIZED_BIT);
  }

  /// Evaluate whether the format is an unsigned normalized format
  export function isdUnorm(format: Format) {
    return isNormalized(format) && isUnsigned(format);
  }

  /// Evaluate whether the format is a signed normalized format
  export function isSnorm(format: Format) {
    return isNormalized(format) && isSigned(format);
  }

  /// Evaluate whether the format is packed
  export function isPacked(format: Format) {
    const flags = formatInfos[format].flags;
    return !!(flags & Cap.PACKED8_BIT || flags & Cap.PACKED16_BIT || flags & Cap.PACKED32_BIT);
  }

  /// Evaluate whether the format is a depth format
  export function isDepth(format: Format) {
    return !!(formatInfos[format].flags & Cap.DEPTH_BIT);
  }

  /// Evaluate whether the format has a stencil component
  export function isStencil(format: Format) {
    return !!(formatInfos[format].flags & Cap.STENCIL_BIT);
  }

  /// Evaluate whether the format has depth and stencil components
  export function isDepthStencil(format: Format) {
    return isDepth(format) && isStencil(format);
  }
}
