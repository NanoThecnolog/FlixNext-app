const fs = require("fs");
const path = require("path");
const { withDangerousMod } = require("@expo/config-plugins");

const IMPORT_ANCHOR = "import android.content.Context\n";
const IMPORT_PATCH = "import android.content.Context\nimport android.graphics.Color\n";
const BLOCK_START = "      // FlixNext subtitle style\n";
const STYLE_ANCHOR = "      // Apply system accessibility caption style but with reasonable base font size\n";
const STYLE_END = "      }\n";

const subtitleStyle = `${BLOCK_START}      setBottomPaddingFraction(0.14f)\n\n      val horizontalPadding = (12 * resources.displayMetrics.density).toInt()\n      val verticalPadding = (6 * resources.displayMetrics.density).toInt()\n      setPadding(horizontalPadding, verticalPadding, horizontalPadding, verticalPadding)\n\n      val captioningManager = context.getSystemService(Context.CAPTIONING_SERVICE) as? CaptioningManager\n      val userStyle = captioningManager?.userStyle\n      val baseStyle = userStyle?.let { CaptionStyleCompat.createFromCaptionStyle(it) }\n        ?: CaptionStyleCompat.DEFAULT\n\n      setStyle(\n        CaptionStyleCompat(\n          baseStyle.foregroundColor,\n          Color.TRANSPARENT,\n          Color.argb(205, 0, 0, 0),\n          baseStyle.edgeType,\n          baseStyle.edgeColor,\n          baseStyle.typeface\n        )\n      )\n\n      val fontScale = captioningManager?.fontScale ?: 1f\n      setFixedTextSize(TypedValue.COMPLEX_UNIT_SP, 16f * fontScale)\n`;

function patchSubtitleUtils(projectRoot) {
  const target = path.join(
    projectRoot,
    "node_modules/expo-video/android/src/main/java/expo/modules/video/utils/SubtitleUtils.kt",
  );

  if (!fs.existsSync(target)) {
    throw new Error(`expo-video SubtitleUtils não encontrado em ${target}`);
  }

  let source = fs.readFileSync(target, "utf8");
  if (source.includes(BLOCK_START)) return;

  if (!source.includes(IMPORT_ANCHOR) || !source.includes(STYLE_ANCHOR)) {
    throw new Error(
      "A estrutura nativa do expo-video mudou; revise o plugin de estilo das legendas.",
    );
  }

  source = source.replace(IMPORT_ANCHOR, IMPORT_PATCH);
  const blockStart = source.indexOf(STYLE_ANCHOR);
  const blockEnd = source.indexOf(STYLE_END, blockStart) + STYLE_END.length;
  source = `${source.slice(0, blockStart)}${subtitleStyle}${source.slice(blockEnd)}`;
  fs.writeFileSync(target, source);
}

module.exports = function withExpoVideoSubtitleStyle(config) {
  return withDangerousMod(config, [
    "android",
    async (modConfig) => {
      patchSubtitleUtils(modConfig.modRequest.projectRoot);
      return modConfig;
    },
  ]);
};
