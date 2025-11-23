# Changelog

## [0.27.5](https://github.com/atty303/pob-web/compare/v0.27.4...v0.27.5) (2025-11-23)


### Bug Fixes

* **driver:** add double-click support to keyboard event handling ([ee6e289](https://github.com/atty303/pob-web/commit/ee6e2893723433c219163d0e9b0b01c2689463e3))
* **driver:** add double-click support to keyboard event handling ([#136](https://github.com/atty303/pob-web/issues/136)) ([ac2e811](https://github.com/atty303/pob-web/commit/ac2e8117d7b563329b764aa35623c0e542fa4ec6))
* **driver:** add support for new lcurl options for SSL and redirects ([822f9b0](https://github.com/atty303/pob-web/commit/822f9b06ebde05330140d8290dfce4c98662f2cd))
* **driver:** add support for new lcurl options for SSL and redirects ([125a7dd](https://github.com/atty303/pob-web/commit/125a7dd1fca3c2713a77581e55913b8dac6f6282))
* **driver:** add support for new lcurl options for SSL and redirects ([#138](https://github.com/atty303/pob-web/issues/138)) ([1caa834](https://github.com/atty303/pob-web/commit/1caa834fd2db64e552b79c03ee2adf90f9403ad8))

## [0.27.4](https://github.com/atty303/pob-web/compare/v0.27.3...v0.27.4) (2025-11-04)


### Bug Fixes

* **web:** add missing Fontin font files ([56d78f4](https://github.com/atty303/pob-web/commit/56d78f4e260d2ed1e3f4aa48d96a3264f15e6199))

## [0.27.3](https://github.com/atty303/pob-web/compare/v0.27.2...v0.27.3) (2025-11-04)


### Bug Fixes

* **driver:** add Fontin font loading ([fb6aa8c](https://github.com/atty303/pob-web/commit/fb6aa8ca1997df6b6fd2798ef7883921c5606313))
* **driver:** add placeholder LuaJIT options ([9494309](https://github.com/atty303/pob-web/commit/94943097d6d670b907bb16cbc465e77bc33db150))
* **driver:** bump version to 0.27.2 in package-lock.json ([c3eee25](https://github.com/atty303/pob-web/commit/c3eee258e332916e9dfef851fd162a8234198f1e))
* PoB1 v2.57.0 compatibility ([#132](https://github.com/atty303/pob-web/issues/132)) ([f3d6768](https://github.com/atty303/pob-web/commit/f3d6768eda7dd630a3259e3b119aa0b66bbbe8bc))

## [0.27.2](https://github.com/atty303/pob-web/compare/v0.27.1...v0.27.2) (2025-09-06)


### Bug Fixes

* **driver:** optimize line width calculation using reduce to avoid stack overflow ([908c444](https://github.com/atty303/pob-web/commit/908c444c361b11baff76537b7879c49a9f846b2d))
* **driver:** update keyboard handling to use new PoBKeyboardState and DOMKeyboardState ([c88051a](https://github.com/atty303/pob-web/commit/c88051ad032365be7466efc67f9e3bfa92ca0d53)), closes [#128](https://github.com/atty303/pob-web/issues/128)

## [0.27.1](https://github.com/atty303/pob-web/compare/v0.27.0...v0.27.1) (2025-08-18)


### Bug Fixes

* **driver:** increase stack size ([a57cf01](https://github.com/atty303/pob-web/commit/a57cf011903bff45f4f4fd84876b4748bc2c67f3))

## [0.27.0](https://github.com/atty303/pob-web/compare/v0.26.0...v0.27.0) (2025-08-16)


### Features

* **ErrorDialog:** implement error handling UI for critical errors ([f64acb5](https://github.com/atty303/pob-web/commit/f64acb5bfc14772044db4cafeee933136ad5d529))
* **sentry:** add console logging integration and enable logs ([3b6b4c6](https://github.com/atty303/pob-web/commit/3b6b4c69deae7b546bdaa42113a205fd898d9a08))


### Bug Fixes

* added error dialog ([#125](https://github.com/atty303/pob-web/issues/125)) ([b167b95](https://github.com/atty303/pob-web/commit/b167b95b6f72972e4e43c6170e581d929c3c99ac))
* **PoBWindow:** update error handling to set error state instead of throwing ([f4b560d](https://github.com/atty303/pob-web/commit/f4b560d04aad0b74e7e15be8c0200628b29ef70d))
* **worker:** add error handling during frame processing in tick method ([246ca8a](https://github.com/atty303/pob-web/commit/246ca8a3cfc08626f4bea92b42260592575000b1))

## [0.26.0](https://github.com/atty303/pob-web/compare/v0.25.0...v0.26.0) (2025-08-16)


### Features

* add zoom control popup with TailwindCSS styling ([ee71bb4](https://github.com/atty303/pob-web/commit/ee71bb44dd09d03e634468bd01fcb0fa475b107b))
* **driver:** add arrow keys to virtual keyboard ([abce212](https://github.com/atty303/pob-web/commit/abce212a7c63ea2180d8a7239c032f5126ae9140))
* **driver:** add auto/fixed size toggle for canvas controls ([eb210bd](https://github.com/atty303/pob-web/commit/eb210bdf5bda37296a9cb4e066f41db11d2db000))
* **driver:** add flexible spacing for external toolbar components ([8612139](https://github.com/atty303/pob-web/commit/8612139e255eb23ccdf701842563a085bd953cf1))
* **driver:** add mobile touch support with responsive toolbar ([f43dcef](https://github.com/atty303/pob-web/commit/f43dcef55124cd16433b33968bba10f10bcea1ee))
* **driver:** add symbol mode to virtual keyboard ([c24e5e6](https://github.com/atty303/pob-web/commit/c24e5e6e08d384eabb0c2381131c3428a3447fcf))
* **driver:** implement minimum canvas size with auto-pan and fix coordinate transforms ([b6bd31a](https://github.com/atty303/pob-web/commit/b6bd31a5212c06012777080866db96c4c5a74396))
* mobile support ([#122](https://github.com/atty303/pob-web/issues/122)) ([90ed6af](https://github.com/atty303/pob-web/commit/90ed6af7aed8c75d165fb7d2084bfea9530f8e44))
* **overlay:** improve virtual keyboard positioning and zoom reset behavior ([de7eae4](https://github.com/atty303/pob-web/commit/de7eae482cefb645e6ec24185900c1077457a7f0))
* **touch:** add three-finger pan gesture for universal canvas navigation ([dbb5936](https://github.com/atty303/pob-web/commit/dbb5936c900ff8c8d05521db0e3db479dfe49a99))
* **web:** add comprehensive help system with mobile controls guide ([256037c](https://github.com/atty303/pob-web/commit/256037cb6e7a3fdf1e1f659ec7ab06b36a35321a))


### Bug Fixes

* **biome:** update fix command to use --write option for file modifications ([7fb699b](https://github.com/atty303/pob-web/commit/7fb699be518b115e713d6c2720e08d1d5f6d07f9))
* **canvas:** implement smart initial zoom for mobile screens ([04a5684](https://github.com/atty303/pob-web/commit/04a56848abb0abcfc4378231b21b779cbf698549))
* **driver:** add Delete key to virtual keyboard layout ([3cfbd3c](https://github.com/atty303/pob-web/commit/3cfbd3c8ad5e332258d484cc6c8bab04450616af))
* **driver:** add virtual keyboard and fix overlay layout issues ([a8eb252](https://github.com/atty303/pob-web/commit/a8eb252f49e8663cc641190e6963ccc996b437b5))
* **driver:** adjust baseline positioning for improved keyboard centering ([b568f87](https://github.com/atty303/pob-web/commit/b568f8757bef72c32e28bbe5c48d3c325c36e9b4))
* **driver:** apply pw: prefix to all TailwindCSS classes in overlay components ([5518d1f](https://github.com/atty303/pob-web/commit/5518d1f328181b0c19e3481ddc57ba8374b98c55))
* **driver:** constrain virtual keyboard position within viewport on resize ([410ea3c](https://github.com/atty303/pob-web/commit/410ea3cb4e80dbcfa0abe747070db9b4dbbbc4dc))
* **driver:** correct virtual keyboard special key handling ([afc98ee](https://github.com/atty303/pob-web/commit/afc98eef7c4efeab059a303e3d90c5a5bc122956))
* **driver:** fix mouse pan functionality by correcting TouchTransformManager updates ([f6e349e](https://github.com/atty303/pob-web/commit/f6e349ee95f58995ebb61f16692019966123558b))
* **driver:** fix transform translateY drift on canvas container resize ([4458784](https://github.com/atty303/pob-web/commit/44587840db0d8aee1b54b923b7ea03df5f0eb292))
* **driver:** implement proper Shift key simulation for virtual keyboard ([fb7066a](https://github.com/atty303/pob-web/commit/fb7066ae50ec82ed65fe8f16e57430b0d89feedd))
* **driver:** improve canvas resize handling for reliable PoB rendering ([d0ae5c7](https://github.com/atty303/pob-web/commit/d0ae5c78fb8e48325dfb5723a45cc03d3394ea1b))
* **driver:** improve mouse state tracking for all events ([162cc51](https://github.com/atty303/pob-web/commit/162cc5122fc9f9252be64c6986bb6d7be6b8d4f6))
* **driver:** prevent mouse movement during 2-finger zoom gestures ([7882f79](https://github.com/atty303/pob-web/commit/7882f79febf9c8309412a38827c7b3fea0818ece))
* **driver:** prevent overlay events from propagating to PoB canvas ([9089960](https://github.com/atty303/pob-web/commit/9089960036bbde39e5af384d2fe80ad68387fc46))
* **driver:** prevent zoom interference during 3-finger pan gestures ([fae1427](https://github.com/atty303/pob-web/commit/fae142762f4d31649c15198eb7d891d3195c4176))
* **driver:** recalculate initial scale on orientation change ([1f8d715](https://github.com/atty303/pob-web/commit/1f8d71593518c9bfe3876f2b65e1d8f94be03f4e))
* **driver:** reduce long press timeout for right-click to 300ms ([bef6776](https://github.com/atty303/pob-web/commit/bef6776f6d7c47a817ccee3802182881327ad7d4))
* **driver:** refactor drag mode to pan tool with improved touch interaction ([b763cb6](https://github.com/atty303/pob-web/commit/b763cb64c1808fbb1a62c61b085193b76a4e0005))
* **driver:** refactor keyboard management to use unified KeyboardState ([4b8ff88](https://github.com/atty303/pob-web/commit/4b8ff883893ee2eead1d6a05a16ffc24d09a663f))
* **driver:** remove automatic pan mode based on canvas size ([7510443](https://github.com/atty303/pob-web/commit/75104430c17e128eac9eaeb6138974926e1cb4f7))
* **driver:** remove unnecessary hold mode functionality from virtual keyboard ([fc3fca8](https://github.com/atty303/pob-web/commit/fc3fca8b3b2aead2499c99fdde1555268e9f570f))
* **driver:** reorder toolbar buttons for better UX ([c050c2a](https://github.com/atty303/pob-web/commit/c050c2a0d93f470f58043c5753e5b1d427ebf731))
* **driver:** replace CSS layers with O- prefix for broader browser support ([445788f](https://github.com/atty303/pob-web/commit/445788f530159df6e27b982335ff0018e85ba826))
* **driver:** resolve coordinate transformation issues with CSS transforms ([bd075a5](https://github.com/atty303/pob-web/commit/bd075a58a35ea92f83f6777bd077a42842f15ae0))
* **driver:** resolve iOS Safari viewport and safe area issues ([1b39960](https://github.com/atty303/pob-web/commit/1b39960f1760363b0275797d448b13f95eaed768))
* **driver:** resolve linter errors in fullscreen implementation ([f0cf183](https://github.com/atty303/pob-web/commit/f0cf183f0a48cb576fecd143b9ffe6d767a25196))
* **driver:** resolve mobile fullscreen API compatibility issues ([a892569](https://github.com/atty303/pob-web/commit/a8925698609a6418d153e38a6d990cbdecd660a7))
* **driver:** resolve tablet rotation layout issues with centralized management ([823c527](https://github.com/atty303/pob-web/commit/823c527faae548824f81baeac8e4f5145c88ff69))
* **driver:** simplify DOM structure to use only canvas container and overlay ([1b6377b](https://github.com/atty303/pob-web/commit/1b6377b3f4a6bc6c3727157ddbf840626061cd17))
* **driver:** update DaisyUI classes to use pw: prefix for proper scoping ([29b4359](https://github.com/atty303/pob-web/commit/29b435950520fb851525c9dc442897812ceed552))
* **driver:** update toolbar to iOS HIG standard 44pt touch targets ([3939ef4](https://github.com/atty303/pob-web/commit/3939ef40fd501aadb29493c3b3ecd253cf0ad6fe))
* **hooks:** update stash method to use 'patch-file' for pre-commit and fix hooks ([542a60b](https://github.com/atty303/pob-web/commit/542a60b3f9e504eb38320c549d604bf27d652fec))
* **keyboard:** refine keypress handling for single character keys ([b549cee](https://github.com/atty303/pob-web/commit/b549cee4c861b6f5351a4dbaf62c1f2dcc29b18b))
* **mobile:** reduce two-finger scroll sensitivity and add PWA manifest ([36ac4c5](https://github.com/atty303/pob-web/commit/36ac4c5266657f3744b914d66c43809f067872f8))
* **mobile:** resolve iOS Safari toolbar overlap issues ([23e6617](https://github.com/atty303/pob-web/commit/23e661725cddfa42e060086165aaf48f26e0d11f))
* **overlay:** prevent virtual keyboard position reset on toggle ([fcf291a](https://github.com/atty303/pob-web/commit/fcf291ad147d04b5e70e6cd0f421e50fdba550a9))
* **touch:** improve gesture handling for consistent zoom and pan behavior ([d87f407](https://github.com/atty303/pob-web/commit/d87f40791fc1ac736fb357192fc6a0ec390e9910))
* **ui:** adjust padding for virtual keyboard and add dark theme to hero section ([6c8702e](https://github.com/atty303/pob-web/commit/6c8702edc46a9a23dd280e308a2fc8a7ba5a6a63))
* **web:** prevent multiple driver start executions in PoBWindow ([8f51e27](https://github.com/atty303/pob-web/commit/8f51e277d08dda9c4dfea101eb7b3985646a0e41))
* **web:** remove tutorial setting from settings dialog ([63bc382](https://github.com/atty303/pob-web/commit/63bc382eba29375f4e84d245b5e1158135bbabee))

## [0.25.0](https://github.com/atty303/pob-web/compare/v0.24.0...v0.25.0) (2025-08-14)


### Features

* Add comprehensive render statistics tracking and display ([8676af6](https://github.com/atty303/pob-web/commit/8676af628e4b138fcb2a7b7e89b05bc466d6706d))
* Add layer visibility toggle functionality ([50d4da3](https://github.com/atty303/pob-web/commit/50d4da3f7f3219df212045e31a431446b7edff0c))


### Performance Improvements

* **driver:** add VAO support for improved vertex attribute management ([aa18e6b](https://github.com/atty303/pob-web/commit/aa18e6b635d316a9d2b2a4de1ce86d0caeaa23ea))
* **driver:** compress vertex color data to reduce memory usage ([e3def1a](https://github.com/atty303/pob-web/commit/e3def1a0db036d526c1311389957cf112cc05386))
* **driver:** implement index buffer for WebGL backend ([2338314](https://github.com/atty303/pob-web/commit/23383147250fd59eb310275288001b7b5d3cecfd))
* **driver:** merge consecutive commands into ranges for efficient processing ([81a3850](https://github.com/atty303/pob-web/commit/81a3850cb657e9860b69674ad317b5f9f6bb27d7))
* **driver:** optimize command sorting to minimize allocations and copies ([c23b038](https://github.com/atty303/pob-web/commit/c23b0382e1b541457de65f9bab348e339b91524c))

## [0.24.0](https://github.com/atty303/pob-web/compare/v0.23.0...v0.24.0) (2025-08-14)


### Features

* add WebGPU rendering backend ([13746aa](https://github.com/atty303/pob-web/commit/13746aa0da2aee1ae695524155066bd5122a43b2))
* **driver:** Add WebGPU rendering backend ([#117](https://github.com/atty303/pob-web/issues/117)) ([b85b6af](https://github.com/atty303/pob-web/commit/b85b6af8c8c1e4264a00fb3d241414e5fa7af200))


### Bug Fixes

* **driver:** enable WebGPU by default in attachToDOM and setCanvas ([e424a78](https://github.com/atty303/pob-web/commit/e424a787a4ed7f256bf61768e7f426d730c42044))
* **driver:** fix WebGPU image texture upload ([e95d05f](https://github.com/atty303/pob-web/commit/e95d05f8fbb2691e60d013f689ff55687798fdbe))
* **driver:** fix WebGPU layer compositing by managing frame-level clearing ([70a99a5](https://github.com/atty303/pob-web/commit/70a99a540dd0eeed9c366c46c638cb54f8f28f7c))
* **driver:** fix WebGPU shader uniform control flow error ([c3a5ab4](https://github.com/atty303/pob-web/commit/c3a5ab4f921ada88ce6930c791eacfb13a7e1377))
* **driver:** fix WebGPU texture binding order ([71dada4](https://github.com/atty303/pob-web/commit/71dada46c9a567fe4931b44369ba941e913fd11f))
* **driver:** fix WebGPU texture rendering issues ([6b49f09](https://github.com/atty303/pob-web/commit/6b49f09b5de53578142edc7f1c712cb061353eef))


### Performance Improvements

* **driver:** enhance data structure alignment and command handling in draw module ([60ecb3c](https://github.com/atty303/pob-web/commit/60ecb3ce719ffb5d424c660a6fe952922960aa6f))
* **driver:** improve build configurations for Debug and Release modes ([f620be4](https://github.com/atty303/pob-web/commit/f620be454b0dd873878a9ad7a1ce5205d4e1d7ab))
* **driver:** optimize VertexBuffer allocation in WebGL/WebGPU backends ([1335242](https://github.com/atty303/pob-web/commit/133524258a0c86a29a1db8713300ecf08866cfbf))
* optimizations ([#119](https://github.com/atty303/pob-web/issues/119)) ([eef7429](https://github.com/atty303/pob-web/commit/eef7429ec354a442a7846bf4f49f8d118d71cb10))

## [0.23.0](https://github.com/atty303/pob-web/compare/v0.22.2...v0.23.0) (2025-08-12)


### Bug Fixes

* **devcontainer:** update mise feature configuration to include install option ([d630aa6](https://github.com/atty303/pob-web/commit/d630aa64deb6f657fa347a3c9a13a033aa2b565b))


### Miscellaneous Chores

* release 0.23.0 ([05a3863](https://github.com/atty303/pob-web/commit/05a3863eaefcc16921d6e079f438b233bb1bb97d))

## [0.22.2](https://github.com/atty303/pob-web/compare/v0.22.1...v0.22.2) (2025-04-28)


### Bug Fixes

* **workflow:** enable schedule for checking new releases ([a598013](https://github.com/atty303/pob-web/commit/a5980137c7303153d37f083b75bbc7a1022b96ad))
* **workflow:** remove game input and use matrix for game selection ([16b7432](https://github.com/atty303/pob-web/commit/16b7432fcc683894e38951d755843a9e6381b23d))

## [0.22.1](https://github.com/atty303/pob-web/compare/v0.22.0...v0.22.1) (2025-04-28)


### Bug Fixes

* **version:** update poe2 head version to v0.8.0 ([f4472d3](https://github.com/atty303/pob-web/commit/f4472d358a450175933b685c0d34047608255c58))
* **version:** update poe2 head version to v0.8.0 ([#111](https://github.com/atty303/pob-web/issues/111)) ([7929fe6](https://github.com/atty303/pob-web/commit/7929fe6e717be63232d435a968b5c8687917674e))

## [0.22.0](https://github.com/atty303/pob-web/compare/v0.21.2...v0.22.0) (2025-04-28)


### Features

* devcontainer and mise for dev environment ([4011521](https://github.com/atty303/pob-web/commit/40115214fbf91f1bfb9256d4bd0d367227f53d9f))
* **driver:** enhance dev server configuration with environment variables ([b4db2b1](https://github.com/atty303/pob-web/commit/b4db2b1f40963c334910aaf7207b2670371b3e81))


### Bug Fixes

* **dds.test.ts:** update file path for reading DDS data ([2d16e3a](https://github.com/atty303/pob-web/commit/2d16e3a237728eba08df1a9c7e38a2e7301903db))
* **driver:** increase  buffer size ([fe43dec](https://github.com/atty303/pob-web/commit/fe43deca77285f7d13a2ee36960b3497ff80b9a6))
* **sync-upstream:** add checksum algorithm to S3 upload command for version.json ([79e32f9](https://github.com/atty303/pob-web/commit/79e32f90e137879a3ac1545ea2020effe85691e9))
* **sync-upstream:** add notification for no new tags found and display new tags in summary ([26ab1fd](https://github.com/atty303/pob-web/commit/26ab1fdaba2cfef126f214d40aa2e8ff2ed1879c))
* **sync-upstream:** add pagination and improve logging for latest tags retrieval ([ba53459](https://github.com/atty303/pob-web/commit/ba534599ff5eef3ecc031572024a1281ee94cad7))
* **sync-upstream:** await exec command for S3 version.json upload ([e51255d](https://github.com/atty303/pob-web/commit/e51255dd6ef0f356d172341cc4f9cf3fd1b58120))
* **sync-upstream:** await exec commands for packing and syncing new tags ([02aed0a](https://github.com/atty303/pob-web/commit/02aed0a811e9ccd8cfdf30a26a5ef235f62eb1eb))
* **sync-upstream:** improve logging format for latest tags output ([c66fea2](https://github.com/atty303/pob-web/commit/c66fea2747687acca18f0694544889aa450bb010))
* **sync-upstream:** optimize tag retrieval using GraphQL and improve sorting of latest tags ([c99dc2c](https://github.com/atty303/pob-web/commit/c99dc2ce0e56ea3c16671795d74780e1f8b0b21c))
* **sync-upstream:** reduce the number of tags fetched to improve performance ([31b092c](https://github.com/atty303/pob-web/commit/31b092c8b9701e0b358472b5cd5fd6c6d948f0f3))
* **sync-upstream:** remove exit on error in tag retrieval script ([ea354ed](https://github.com/atty303/pob-web/commit/ea354ed70ca8567a1b968b9179485ac304f1353e))
* **sync-upstream:** remove pagination for tag retrieval and add exit on error ([155fce0](https://github.com/atty303/pob-web/commit/155fce029008b2e2dd1cba5166fbae0a9e7c4d75))
* **sync-upstream:** remove setup-node action and adjust job steps for better clarity ([cafb415](https://github.com/atty303/pob-web/commit/cafb41564787eab8bab6cb644fc665c384c6b755))
* **sync-upstream:** update condition checks for new versions to handle null values ([0abe35c](https://github.com/atty303/pob-web/commit/0abe35c19363497260a7da78f0ad84f604991fc5))
* **version.json:** reorder version entries for consistency ([3c181d0](https://github.com/atty303/pob-web/commit/3c181d0c1c8434e38ebfca36c823ed06a20d621f))
* **version.json:** update poe2 head version to v0.5.0 ([b53160d](https://github.com/atty303/pob-web/commit/b53160d9936d4b1207eaca323083b3418efb101e))

## [0.21.2](https://github.com/atty303/pob-web/compare/v0.21.1...v0.21.2) (2025-02-25)


### Bug Fixes

* **driver:** update exported functions and dynamic import path ([d0cc76c](https://github.com/atty303/pob-web/commit/d0cc76c5887ee652c2e739e7f2029367d2fee661))
* **driver:** update exported functions and dynamic import path ([#105](https://github.com/atty303/pob-web/issues/105)) ([99b64e2](https://github.com/atty303/pob-web/commit/99b64e218cef772e8eb40cd3bc1f32fc4a30ca49)), closes [#104](https://github.com/atty303/pob-web/issues/104)

## [0.21.1](https://github.com/atty303/pob-web/compare/v0.21.0...v0.21.1) (2025-02-24)


### Bug Fixes

* build ([80c83a2](https://github.com/atty303/pob-web/commit/80c83a2efc70a25fe6acc7c06eeccffdb77ca2da))

## [0.21.0](https://github.com/atty303/pob-web/compare/v0.20.0...v0.21.0) (2025-02-24)


### Features

* **driver:** add lua-utf8.wasm loading ([1eda6b0](https://github.com/atty303/pob-web/commit/1eda6b0a6ac5a2ee9b845f45f0bcb27065496c99))
* **driver:** add support for building lua-utf8 module ([9be9ce5](https://github.com/atty303/pob-web/commit/9be9ce552df83993be5eb4f97e5622fea2d3d743))
* **driver:** add support for building lua-utf8 module  ([#100](https://github.com/atty303/pob-web/issues/100)) ([c240c3d](https://github.com/atty303/pob-web/commit/c240c3d1f786877b1ea171ed8f7e36aeef4523ff)), closes [#98](https://github.com/atty303/pob-web/issues/98)


### Bug Fixes

* **driver:** build ([01b07bd](https://github.com/atty303/pob-web/commit/01b07bd9a1b8c1361e9369478ef29f5d96c22e7e))
* **driver:** mkdir and rename dir ([8b45a98](https://github.com/atty303/pob-web/commit/8b45a98e2e943a9e564cb036811bf3c3b279b6e5))
* **driver:** mkdir and rename dir ([#101](https://github.com/atty303/pob-web/issues/101)) ([b4c10ee](https://github.com/atty303/pob-web/commit/b4c10ee883e814c8224d6dd674dbc793ff6c3df0))
* **packer:** sync v1 path ([6a5331d](https://github.com/atty303/pob-web/commit/6a5331d57a97fd07bd54130d07e5c16c0512d618))

## [0.20.0](https://github.com/atty303/pob-web/compare/v0.19.2...v0.20.0) (2025-01-30)


### Features

* **web:** add close button to Sidebar for improved user experience ([4a9b760](https://github.com/atty303/pob-web/commit/4a9b760900c0cfefc8dfd8788939ccb65583b8df))
* **web:** add PoBController and routing for Path of Exile versions ([53ef093](https://github.com/atty303/pob-web/commit/53ef09317d922a3736af6550eef60f9e9d6f8d4e))
* **web:** add user namespace support for Cloudflare KV integration ([0881765](https://github.com/atty303/pob-web/commit/08817657a166ef20e271dec2595b8b4fe8dcd937))
* **web:** enhance PerformanceView and LineChart for improved render time visualization ([a455312](https://github.com/atty303/pob-web/commit/a455312fdd20d2e4ef57bc2ba53d485959b2d86e))
* **web:** enhance PoBController to manage tutorial and drawer state ([6b0ae4d](https://github.com/atty303/pob-web/commit/6b0ae4d05241e42afee1747ce9ac25dddfe83c25))
* **web:** integrate dayjs for date handling and update version data structure ([07bdb1b](https://github.com/atty303/pob-web/commit/07bdb1b28a89167d053867a8f7019d8f4deea09c))
* **web:** re-bumped ([#94](https://github.com/atty303/pob-web/issues/94)) ([a581e85](https://github.com/atty303/pob-web/commit/a581e851df8950296baba16fb721361e53fda62f))
* **web:** refactor routing for Path of Exile versions and update PoBController links ([f0c3f12](https://github.com/atty303/pob-web/commit/f0c3f12a37080950d4639a982eada321f7457ef9))
* **web:** update redirect logic for build hash handling in routes and PoBWindow ([5f4df34](https://github.com/atty303/pob-web/commit/5f4df342d9dac52d93ade91b4cdcdf720da3d2e8))


### Bug Fixes

* **web:** enhance WebGL backend with improved texture handling and format support ([5a77c4c](https://github.com/atty303/pob-web/commit/5a77c4c70a32909731e229405307cf711bf74ab3))
* **web:** implement error boundary for route error handling ([9829ffb](https://github.com/atty303/pob-web/commit/9829ffb7a6884cd9f6bdf0ab2908b00520dfaf92))
* **web:** update hero background image path and adjust deployment script for build output ([097868b](https://github.com/atty303/pob-web/commit/097868b9f70d8238002ac283ca4bc5d7af93469d))

## [0.19.2](https://github.com/atty303/pob-web/compare/v0.19.1...v0.19.2) (2025-01-28)


### Bug Fixes

* **driver:** generate mipmaps for image ([9fe51fe](https://github.com/atty303/pob-web/commit/9fe51fe3114cbcce43a871317a8978f4d9b6907c))
* **driver:** generate mipmaps for image ([#90](https://github.com/atty303/pob-web/issues/90)) ([957f295](https://github.com/atty303/pob-web/commit/957f295ba633c5eca77d752131baf77ab911f56d))

## [0.19.1](https://github.com/atty303/pob-web/compare/v0.19.0...v0.19.1) (2025-01-27)


### Performance Improvements

* **driver:** fix performance in zenfs ([1cbcaff](https://github.com/atty303/pob-web/commit/1cbcaffdcf5a01ca990248420e95dfc6a4eebc62))

## [0.19.0](https://github.com/atty303/pob-web/compare/v0.18.0...v0.19.0) (2025-01-27)


### Features

* **driver:** add dds texture support ([166f15e](https://github.com/atty303/pob-web/commit/166f15e50c5b0c2d3bf879c92bc8867031d8f495))
* **driver:** add dds texture support at packer ([c4f1cc0](https://github.com/atty303/pob-web/commit/c4f1cc063f24fc60f85b9ef9f44f785e6b81348b))
* **driver:** Add stackLayer and maskLayer support for draw commands ([cc885eb](https://github.com/atty303/pob-web/commit/cc885eb6e092d7ca38592c93063c3448e9ff7f48))
* **driver:** update TEXTURE_2D_ARRAY ([650e0c6](https://github.com/atty303/pob-web/commit/650e0c6f4f3c93dcbfd78f052fbb034819c6225f))
* **driver:** using webgl2 ([ae715e8](https://github.com/atty303/pob-web/commit/ae715e81b05538f8c846c306e34131bf73fd6681))
* **web:** Add multi-product support for PoE1 and PoE2 integration ([ab9477f](https://github.com/atty303/pob-web/commit/ab9477f611a2cfbe3891bf78813facbe31a0a4ee))


### Bug Fixes

* **driver:** Add improvements for DDS texture handling and logging ([2c774b4](https://github.com/atty303/pob-web/commit/2c774b42b4238c1fcd03db1fd83385d9fc8b9f41))
* **driver:** blend function ([cd2e5c4](https://github.com/atty303/pob-web/commit/cd2e5c4b56d82a14d52a793a68e401d717d82717))
* **driver:** correct alpha blending ([04bb1b1](https://github.com/atty303/pob-web/commit/04bb1b17a51fff47542e29b4ea324a1eb0fd9890)), closes [#40](https://github.com/atty303/pob-web/issues/40) [#39](https://github.com/atty303/pob-web/issues/39)
* **driver:** invalid texture target ([a327792](https://github.com/atty303/pob-web/commit/a32779202b1f5428ad24f3bf7f09d3f1fb7f42f0))
* **packer:** add directory entry ([c876973](https://github.com/atty303/pob-web/commit/c8769733478d5316b78a6e3be33106a00e9fee98))
* **packer:** case insensitive ([da0ac77](https://github.com/atty303/pob-web/commit/da0ac77aa1ab7601c2f04466f787e1e5f8a39737))

## [0.18.0](https://github.com/atty303/pob-web/compare/v0.17.0...v0.18.0) (2024-11-22)


### Features

* **web:** added version.json ([5135afd](https://github.com/atty303/pob-web/commit/5135afd11dd481d4c3091c99c81d0ff7ca39b42d))
* **web:** automatic version sync with upstream ([d759034](https://github.com/atty303/pob-web/commit/d7590346e9df42c401bbcbd49f25da79144db29f))

## [0.17.0](https://github.com/atty303/pob-web/compare/v0.16.0...v0.17.0) (2024-11-21)


### Features

* **web:** added version: v2.49.0 ([9b96660](https://github.com/atty303/pob-web/commit/9b9666004bf5bb1d2d65a6c54f4d585db6af7176))

## [0.16.0](https://github.com/atty303/pob-web/compare/v0.15.0...v0.16.0) (2024-07-30)


### Features

* **web:** added version: v2.47.3 ([3010898](https://github.com/atty303/pob-web/commit/3010898c4fd9c1a0fc4521528892aeb6d872c2d8))

## [0.15.0](https://github.com/atty303/pob-web/compare/v0.14.0...v0.15.0) (2024-07-25)


### Features

* **web:** added version: v2.46.0 ([63080d6](https://github.com/atty303/pob-web/commit/63080d66ccdefafef3dc28320b942b5a315dce22))

## [0.14.0](https://github.com/atty303/pob-web/compare/v0.13.0...v0.14.0) (2024-07-23)


### Features

* **web:** added version: v2.44.0 ([bc72727](https://github.com/atty303/pob-web/commit/bc7272774830d0e2d3941ec72df792fd5986ab91))

## [0.13.0](https://github.com/atty303/pob-web/compare/v0.12.0...v0.13.0) (2024-07-22)


### Features

* **web:** added version: v2.43.0 ([409e3b8](https://github.com/atty303/pob-web/commit/409e3b881f38849314ef2963023a35247b2a7827))

## [0.12.0](https://github.com/atty303/pob-web/compare/v0.11.3...v0.12.0) (2024-07-21)


### Features

* **web:** added version: 20240722-75b4e82 ([2704e82](https://github.com/atty303/pob-web/commit/2704e828bd3e8b58a1d02986ff4b11c2674cfb1a))

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
