# Changelog

## [0.11.3](https://github.com/atty303/pob-web/compare/v0.11.2...v0.11.3) (2024-05-31)


### Bug Fixes

* **web:** double pob window ([b45bcdb](https://github.com/atty303/pob-web/commit/b45bcdba69a34141e1c95b512fc87a9e1e04dabb))

## [0.11.2](https://github.com/atty303/pob-web/compare/v0.11.1...v0.11.2) (2024-05-31)


### Bug Fixes

* **web:** mobile viewport ([91a87a5](https://github.com/atty303/pob-web/commit/91a87a54a60d216edcf7d2c858dd5e53d8e99af9))

## [0.11.1](https://github.com/atty303/pob-web/compare/v0.11.0...v0.11.1) (2024-05-26)


### Bug Fixes

* **driver:** import to new build ([4784638](https://github.com/atty303/pob-web/commit/4784638a8398b5cf70246cef95612e7d8048a0dd))
* **driver:** text color and measure cursor index ([93bfd1d](https://github.com/atty303/pob-web/commit/93bfd1d1b3f95028353aa5aad4c4824b3f73c012)), closes [#67](https://github.com/atty303/pob-web/issues/67)

## [0.11.0](https://github.com/atty303/pob-web/compare/v0.10.0...v0.11.0) (2024-05-26)


### Features

* **web:** fullscreen ([8a46eed](https://github.com/atty303/pob-web/commit/8a46eed0039175e9f64280c1e64dca641b582f89)), closes [#5](https://github.com/atty303/pob-web/issues/5)


### Bug Fixes

* **web:** Modal dialog adds a none existent scrollbar spacing to backdrop ([16c5cc4](https://github.com/atty303/pob-web/commit/16c5cc44c0cfa2148324fa94e3a83cd6cbfd7d3b)), closes [#65](https://github.com/atty303/pob-web/issues/65)

## [0.10.0](https://github.com/atty303/pob-web/compare/v0.9.0...v0.10.0) (2024-05-25)


### Features

* **web:** load build from hash ([898dec8](https://github.com/atty303/pob-web/commit/898dec881e2ddce03dc28465d2c24ccdbb009f6e)), closes [#20](https://github.com/atty303/pob-web/issues/20)


### Bug Fixes

* **driver:** disallow POESESSID cookie ([1a8879e](https://github.com/atty303/pob-web/commit/1a8879e85d307861de5d4c2d94c4a316ba9d5016))
* **driver:** fetch result length ([d43d131](https://github.com/atty303/pob-web/commit/d43d131880a8eb2d09eb4ec5c37c747aba1fe832)), closes [#62](https://github.com/atty303/pob-web/issues/62) [#60](https://github.com/atty303/pob-web/issues/60)
* **driver:** lcurl header handling ([26a1b48](https://github.com/atty303/pob-web/commit/26a1b489ce4d8e7e02cabe201c0377472e65ed0b))
* **driver:** rasterize text longer than texture width ([7fbc274](https://github.com/atty303/pob-web/commit/7fbc274b72b4bcba9357d0e9a7e2e4732e3c587a)), closes [#22](https://github.com/atty303/pob-web/issues/22)
* **driver:** render always when window is visible ([44b0537](https://github.com/atty303/pob-web/commit/44b0537b50b6f7b8899575cf6dc13f098748e434)), closes [#63](https://github.com/atty303/pob-web/issues/63)

## [0.9.0](https://github.com/atty303/pob-web/compare/v0.8.0...v0.9.0) (2024-05-21)


### Features

* **driver:** implement subscript and lcurl.safe ([#57](https://github.com/atty303/pob-web/issues/57)) ([b108bef](https://github.com/atty303/pob-web/commit/b108befeaebcbc2880964525b39bfbebac059720))


### Bug Fixes

* **driver:** find timeless jewel ([17110fe](https://github.com/atty303/pob-web/commit/17110feff9c9be37e754a04ed66f666f629e207c)), closes [#16](https://github.com/atty303/pob-web/issues/16)

## [0.8.0](https://github.com/atty303/pob-web/compare/v0.7.6...v0.8.0) (2024-05-19)


### Features

* added cloudflare kv filesystem ([d2acef0](https://github.com/atty303/pob-web/commit/d2acef00c209d3fbf634aa94f43a29c5748d32b4)), closes [#48](https://github.com/atty303/pob-web/issues/48)


### Bug Fixes

* **driver:** don't clear cache ([dc1df89](https://github.com/atty303/pob-web/commit/dc1df89db8ac4e217b8c6cbc52fe1dde456762f7)), closes [#49](https://github.com/atty303/pob-web/issues/49)

## [0.7.6](https://github.com/atty303/pob-web/compare/v0.7.5...v0.7.6) (2024-05-19)


### Bug Fixes

* **driver:** rename file ([f65bd1d](https://github.com/atty303/pob-web/commit/f65bd1dec86f40d5743c7176727d0febf067c2e8))
* **driver:** use opfs ([09329b6](https://github.com/atty303/pob-web/commit/09329b64c9c8be0a2acb5b65aa44607cd96a2cbf))
* **driver:** wasmfs ([988c733](https://github.com/atty303/pob-web/commit/988c7332801b44b01b1bbb29a82874de240f19e7))


### Performance Improvements

* **driver:** load time ([967fec7](https://github.com/atty303/pob-web/commit/967fec7e969cdf12a1c237e312156bd1f74efca4))

## [0.7.5](https://github.com/atty303/pob-web/compare/v0.7.4...v0.7.5) (2024-05-16)


### Bug Fixes

* **driver:** disable antialias ([7313473](https://github.com/atty303/pob-web/commit/7313473cfc71e7c5a37a220b9847a2be7f3e13bb)), closes [#6](https://github.com/atty303/pob-web/issues/6)
* **driver:** measure multiline text ([4c42200](https://github.com/atty303/pob-web/commit/4c42200cc774ef3b0b49e253d7b2df1898557ed8)), closes [#21](https://github.com/atty303/pob-web/issues/21)

## [0.7.4](https://github.com/atty303/pob-web/compare/v0.7.3...v0.7.4) (2024-05-16)


### Bug Fixes

* **driver:** alpha ([835e1f3](https://github.com/atty303/pob-web/commit/835e1f3088817fd8f9deef301c5386bc78bf573b))
* **driver:** bin packing text renderer ([617519f](https://github.com/atty303/pob-web/commit/617519f1d64227b4effa085e5e83939d953a1898))
* **driver:** cors error ([eba2d9a](https://github.com/atty303/pob-web/commit/eba2d9a20f372a42f7ec47c0ff070e91d1f8c040))
* **driver:** local storage ([d61bf30](https://github.com/atty303/pob-web/commit/d61bf30b59f988e4b160a2c63d96d83e6e987497)), closes [#42](https://github.com/atty303/pob-web/issues/42)
* **driver:** nodefs ([fbd1fff](https://github.com/atty303/pob-web/commit/fbd1fffe1efac27704816ec90526cc078ec25048))
* **driver:** open url ([1dca8f7](https://github.com/atty303/pob-web/commit/1dca8f712e38f7310125fb6debded729c4211b44)), closes [#44](https://github.com/atty303/pob-web/issues/44)
* **driver:** shell ([8b85466](https://github.com/atty303/pob-web/commit/8b854660634ec9974f04cb25bfc9b9fab5d99c13))

## [0.7.3](https://github.com/atty303/pob-web/compare/v0.7.2...v0.7.3) (2024-05-14)


### Bug Fixes

* **web:** link to known missing feature ([559648b](https://github.com/atty303/pob-web/commit/559648b794df82b9073b2332f368e63de3028eec))

## [0.7.2](https://github.com/atty303/pob-web/compare/v0.7.1...v0.7.2) (2024-05-14)


### Bug Fixes

* **driver:** blend func ([ad210a0](https://github.com/atty303/pob-web/commit/ad210a0d5396cd66056292b89285280febf48b3b)), closes [#40](https://github.com/atty303/pob-web/issues/40)
* **driver:** dirty count ([1ab827e](https://github.com/atty303/pob-web/commit/1ab827e3264570c7ce02184bf9d80b6995e27f9f))
* **driver:** text flickering ([6429b1f](https://github.com/atty303/pob-web/commit/6429b1f81c3db35309d827febcc84b44e101707e)), closes [#19](https://github.com/atty303/pob-web/issues/19)

## [0.7.1](https://github.com/atty303/pob-web/compare/v0.7.0...v0.7.1) (2024-05-14)


### Bug Fixes

* added texture flags ([59d9148](https://github.com/atty303/pob-web/commit/59d9148d202b025d59021ac0813d6aa4608bd3c8))

## [0.7.0](https://github.com/atty303/pob-web/compare/v0.6.0...v0.7.0) (2024-05-14)


### Features

* run pob on web worker ([cd8b7e4](https://github.com/atty303/pob-web/commit/cd8b7e4b63dc4e0a76f9343fee2629e7f5ae4513))


### Bug Fixes

* **driver:** cloud storage on worker ([094ca1c](https://github.com/atty303/pob-web/commit/094ca1c27c2008132b42c551341aea8457e94f8e))
* **driver:** font loading on worker ([2808c86](https://github.com/atty303/pob-web/commit/2808c86a19f822ff926cbbd1a021ea1a566711b3))
* **driver:** local storage on worker ([f70c0ba](https://github.com/atty303/pob-web/commit/f70c0bae181a889399c25b0dd5611c439fe4347e))
* **web:** auth error ([8e06d0e](https://github.com/atty303/pob-web/commit/8e06d0ed237fe4221133c02932b2f789c171e3b2))
* **web:** pob window component cleanup ([5598f5a](https://github.com/atty303/pob-web/commit/5598f5a6295f615b78e3de086b31163bf1d99154))

## [0.6.0](https://github.com/atty303/pob-web/compare/v0.5.0...v0.6.0) (2024-05-13)


### Features

* selectable PoB version ([#34](https://github.com/atty303/pob-web/issues/34)) ([d3bd5eb](https://github.com/atty303/pob-web/commit/d3bd5ebdaf8ed4c96be3033e9728e4be2bdddfbd))


### Bug Fixes

* **web:** preload font ([07d491e](https://github.com/atty303/pob-web/commit/07d491efcd86d237ad60e921f7260f78b46f3ea9)), closes [#4](https://github.com/atty303/pob-web/issues/4)

## [0.5.0](https://github.com/atty303/pob-web/compare/v0.4.0...v0.5.0) (2024-05-12)


### Features

* **driver:** implement fs ([79c3792](https://github.com/atty303/pob-web/commit/79c3792c6a2ed440a739d64f709cc6b715abb06f))
* **driver:** implement MakeDir/RemoveDir ([d56fd60](https://github.com/atty303/pob-web/commit/d56fd60964319c38a5a3dd2a4457b1525fbf44f2))
* **web:** added auth0 ([a81b930](https://github.com/atty303/pob-web/commit/a81b930ca5449a084b2d000e478ea10c0062ab3d))
* **web:** added cloud filesystem ([4c1f246](https://github.com/atty303/pob-web/commit/4c1f2466a1a93aa8923c56531ba5495085ece962))
* **web:** added kv api ([bfeec36](https://github.com/atty303/pob-web/commit/bfeec36fb4fa2f9939d985fbe9e6c3700df954a4))

## [0.4.0](https://github.com/atty303/pob-web/compare/v0.3.4...v0.4.0) (2024-05-11)


### Features

* **driver:** implement DownloadPage API ([#23](https://github.com/atty303/pob-web/issues/23)) ([7d88097](https://github.com/atty303/pob-web/commit/7d8809724f0a61f22d2f9899fecdbc1b932dde8e))

## [0.3.4](https://github.com/atty303/pob-web/compare/v0.3.3...v0.3.4) (2024-05-11)


### Bug Fixes

* **driver:** compatibility with lua 5.1 ([b0852c3](https://github.com/atty303/pob-web/commit/b0852c3b26ed94d50834f51543ba9f296fdd1b45))
* **driver:** fixes [#1](https://github.com/atty303/pob-web/issues/1) ([7daa555](https://github.com/atty303/pob-web/commit/7daa55510f8cbfbcbbcbe8d9e5f26a9bf6cb681a))

## [0.3.3](https://github.com/atty303/pob-web/compare/v0.3.2...v0.3.3) (2024-05-11)


### Bug Fixes

* throw on error ([cfa83ca](https://github.com/atty303/pob-web/commit/cfa83ca2d38945560441cbe36c73627de0f9ac7f))

## [0.3.2](https://github.com/atty303/pob-web/compare/v0.3.1...v0.3.2) (2024-05-11)


### Bug Fixes

* console.log ([bc603e1](https://github.com/atty303/pob-web/commit/bc603e135964701ca865f8b42ab7d559a80d3912))

## [0.3.1](https://github.com/atty303/pob-web/compare/v0.3.0...v0.3.1) (2024-05-11)


### Features

* GetTime ([9ea83b8](https://github.com/atty303/pob-web/commit/9ea83b819036710dcd579168c7fa8d1e54dc1f11))


### Bug Fixes

* deploy ([943969d](https://github.com/atty303/pob-web/commit/943969d9092a2ea274dfb5087d2f96fbe802a997))

## [0.3.0](https://github.com/atty303/pob-web/compare/v0.3.0...v0.3.0) (2024-05-11)


### Bug Fixes

* deploy ([943969d](https://github.com/atty303/pob-web/commit/943969d9092a2ea274dfb5087d2f96fbe802a997))

## [0.3.0](https://github.com/atty303/pob-web/compare/v0.2.0...v0.3.0) (2024-05-11)


### Features

* implement Deflate, Inflate ([48de82f](https://github.com/atty303/pob-web/commit/48de82fcd3cf55639ae97dec5d88729316ee8b5f))

## [0.2.0](https://github.com/atty303/pob-web/compare/v0.1.0...v0.2.0) (2024-05-10)


### Features

* copy and paste ([5da8038](https://github.com/atty303/pob-web/commit/5da8038f1dda3320c53bb7594da24329de3597ee))
* DrawStringCursorIndex ([7b487d9](https://github.com/atty303/pob-web/commit/7b487d923a28a3241d05d1516c8f0bcc16e78703))
* keyboard handling ([d9f6885](https://github.com/atty303/pob-web/commit/d9f6885371ab61ffef061c8c9a77cd5ad9b205b9))
* keyboard handling ([d718e1c](https://github.com/atty303/pob-web/commit/d718e1ca8028024461723fb73bf33f22dabf50c5))
* keyboard handling ([2b2df41](https://github.com/atty303/pob-web/commit/2b2df41fda587129b0f1cf1ac325c7170ffc27ef))
* keyboard handling ([8ae2d3e](https://github.com/atty303/pob-web/commit/8ae2d3e25a3e19f3e972c9b32cb7291bf8994a62))
* keyboard handling ([ef20882](https://github.com/atty303/pob-web/commit/ef20882302fe679db6a64371897e3bc185722167))

## 0.1.0 (2024-05-10)


### Features

* added engine ([77ff143](https://github.com/atty303/pob-web/commit/77ff14382eaa135d583d884cf5defb463ddbed08))
* draw quad ([476bdf4](https://github.com/atty303/pob-web/commit/476bdf42aa82a2d9a57a2052bcdf89d10be3fa79))
* draw string ([8c1a7ec](https://github.com/atty303/pob-web/commit/8c1a7ecb2ef655e2d261b3c91c1251dcbab8a34f))
* drawimage ([f4242e8](https://github.com/atty303/pob-web/commit/f4242e8ec5dc6be5f0ca4a12b427b5f803d6dad7))
* favicon ([a9ee139](https://github.com/atty303/pob-web/commit/a9ee13956271718f3db1fed8cf17522a179e5fa6))
* image draw ([fdeac21](https://github.com/atty303/pob-web/commit/fdeac21eca704271e65876cb7164dd377bcebc46))
* image handle ([c9bf48d](https://github.com/atty303/pob-web/commit/c9bf48d78fa3c374ed1fbb2ca4151fe314c56f48))
* launch headless ([eb2cb49](https://github.com/atty303/pob-web/commit/eb2cb4952b55c875a44a3d83667e6adebd6008cb))
* launch pob ([d7cb7f8](https://github.com/atty303/pob-web/commit/d7cb7f8ba5aac121c567445a041db77480dcf309))
* resize ([4a83c3c](https://github.com/atty303/pob-web/commit/4a83c3c210845a602479b223da694598bd06c6aa))
* screen size ([5e663ce](https://github.com/atty303/pob-web/commit/5e663ce7d06cbd7077bf36509748f178f5f92476))
* tree draw ([e3ef19d](https://github.com/atty303/pob-web/commit/e3ef19d206d2599b04ce413fd53aa6c987d65ad9))
* viewport ([e5f2947](https://github.com/atty303/pob-web/commit/e5f294792daa05c58e9ab23d00a515b4316c17ff))
* web ([839045d](https://github.com/atty303/pob-web/commit/839045d0397331cf57d9ac6dee706b5656d7fc14))
* web ([f4dd2dc](https://github.com/atty303/pob-web/commit/f4dd2dc8b265d887991e0c47804637146ff718db))
* web ([0df4d97](https://github.com/atty303/pob-web/commit/0df4d971348701d3a8bde9c9c50fcaefb05bd5bd))
* web ([5fa0df4](https://github.com/atty303/pob-web/commit/5fa0df4c1085887a903309f94aad9e91d6352a20))


### Bug Fixes

* color escape ([f26dac8](https://github.com/atty303/pob-web/commit/f26dac855c0135e1addc4d002665dbce7a712ae5))
* driver shell ([af74562](https://github.com/atty303/pob-web/commit/af745627319e603b51296e5c029d1b575fd7e764))
* mouse position ([e24383c](https://github.com/atty303/pob-web/commit/e24383c8d4cfd8dd5690d43cb2a5f38eb90fb6ee))


### Miscellaneous Chores

* release 0.1.0 ([436c595](https://github.com/atty303/pob-web/commit/436c595df034fd55ef37bbc25aabfeaf6abd38c7))
