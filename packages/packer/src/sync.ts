import { default as shelljs } from "shelljs";
import "dotenv/config";

shelljs.config.verbose = true;

const tag = process.argv[2];
if (!tag || !tag.startsWith("v")) {
	console.error("Invalid tag");
	process.exit(1);
}

shelljs.exec(
	`aws s3 sync --region auto --endpoint-url ${process.env.R2_ENDPOINT_URL} build/${tag}/r2 s3://pob-web/versions/${tag}`,
	{ fatal: true },
);
