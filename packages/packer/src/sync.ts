import { default as shelljs } from "shelljs";
import "dotenv/config";

shelljs.config.verbose = true;

const tag = process.argv[2];
if (!tag) {
  console.error("Invalid tag");
  process.exit(1);
}

let product;
switch (process.argv[3]) {
  case "poe1":
    product = 1;
    break;
  case "poe2":
    product = 2;
    break;
  case "le":
    product = 3;
    break;
  default:
    product = undefined;
}
if (!product) {
  console.error("Invalid target");
  process.exit(1);
}

const dst = product === 1 ? `s3://pob-web/versions/${tag}` : `s3://pob-web/versions.${product}/${tag}`;
shelljs.exec(
  `aws s3 sync --checksum-algorithm CRC32 --region auto --endpoint-url ${process.env.R2_ENDPOINT_URL} build/${product}/${tag}/r2 ${dst}`,
  { fatal: true },
);
