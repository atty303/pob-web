use dioxus::prelude::*;
use wasm_bindgen::prelude::*;

#[wasm_bindgen(module = "/src/package.mjs")]
extern "C" {
    #[wasm_bindgen(js_namespace = driver)]
    pub fn init();
}

fn app() -> Element {
    let mut layers = use_signal(|| None);

    rsx! {
        div {
            id: "layers",
            position: "relative",
            width: "1920px",
            height: "1080px",
            onmounted: move |e| {
                let el = e.downcast::<web_sys::Element>().unwrap();
                layers.set(Some(el.clone()));
                init();
            }
        }
    }
}

fn main() {
    launch(app);
}
