use std::cell::RefCell;
use std::rc::Rc;

use dioxus::prelude::*;
use futures_util::stream::StreamExt;
use wasm_bindgen::prelude::*;

#[wasm_bindgen(module = "/src/package.mjs")]
extern "C" {
    pub type Engine;

    #[wasm_bindgen(constructor)]
    pub fn new() -> Engine;

    #[wasm_bindgen(method)]
    pub fn test(this: &Engine);
}

fn request_animation_frame(f: &Closure<dyn FnMut()>) {
    web_sys::window()
        .unwrap()
        .request_animation_frame(f.as_ref().unchecked_ref())
        .unwrap();
}

fn app() -> Element {
    let mut frames = use_signal(|| 0);
    let mut canvas = use_signal(|| None);

    let tick = use_coroutine(|mut rx| async move {
        let mut engine = None;
        while let Some(_) = rx.next().await {
            frames += 1;
            if let Some(c) = canvas() {
                if engine.is_none() {
                    let e = Engine::new();
                    e.test();
                    engine = Some(e);
                }
            }
        }
    });

    use_effect(move || {
        let f = Rc::new(RefCell::new(None));
        let g = f.clone();

        let tx = tick.tx();
        *g.borrow_mut() = Some(Closure::new(move || {
            // frames += 1;

            tx.unbounded_send(()).unwrap();

            request_animation_frame(f.borrow().as_ref().unwrap());
        }));
        request_animation_frame(g.borrow().as_ref().unwrap());
    });

    rsx! {
        div { "frames: {frames}" }
        canvas {
            id: "canvas",
            width: 1920,
            height: 1080,
            onmounted: move |e| {
                let el = e.downcast::<web_sys::Element>().unwrap();
                canvas.set(el.dyn_ref::<web_sys::HtmlCanvasElement>().map(|e| e.clone()));
            }
        }
    }
}

fn main() {
    launch(app);
}
