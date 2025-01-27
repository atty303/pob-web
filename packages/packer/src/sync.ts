import { default as shelljs } from "shelljs";
import "dotenv/config";

shelljs.config.verbose = true;

const tag = process.argv[2];
if (!tag) {
  console.error("Invalid tag");
  process.exit(1);
}

const product = process.argv[3] === "1" ? 1 : process.argv[3] === "2" ? 2 : undefined;
if (!product) {
  console.error("Invalid target");
  process.exit(1);
}

shelljs.exec(
  `aws s3 sync --region auto --endpoint-url ${process.env.R2_ENDPOINT_URL} build/${product}/${tag}/r2 s3://pob-web/versions.${product}/${tag}`,
  { fatal: true },
);
