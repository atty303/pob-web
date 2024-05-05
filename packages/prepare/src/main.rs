use imsz::Imsz;
use std::ffi::OsStr;
use std::fs;
use std::io::Write;
use std::path::Path;

fn visit_dirs<F: FnMut(&Path, &Path) + 'static>(
    base: &Path,
    dir: &Path,
    f: &mut F,
) -> std::io::Result<()> {
    if dir.is_dir() {
        for entry in fs::read_dir(dir)? {
            let entry = entry?;
            let path = entry.path();
            if path.is_dir() {
                visit_dirs(base, &path, f)?;
            } else {
                f(&path, base)
            }
        }
    }
    Ok(())
}

fn main() -> std::io::Result<()> {
    if !Path::new("target/vfs").exists() {
        fs::create_dir("target/vfs")?;
    }

    let mut out = fs::File::create("target/fs.tsv")?;

    let mut f = move |path: &Path, base: &Path| {
        let rel_path = path
            .strip_prefix(&base)
            .unwrap()
            .display()
            .to_string()
            .replace("\\", "/");

        if path.extension() == Some(OsStr::new("png"))
            || path.extension() == Some(OsStr::new("jpg"))
        {
            let size = path.imsz().unwrap();
            write!(out, "{}\t{}\t{}\n", rel_path, size.width, size.height).unwrap();

            let ff = format!("target/vfs/{}", rel_path);
            let f = Path::new(&ff);
            let dir = f.parent().unwrap();
            if !dir.exists() {
                fs::create_dir_all(dir).unwrap();
            }
            fs::File::create(f).unwrap();
        }

        if path.extension() == Some(OsStr::new("lua")) {
            let ff = format!("target/vfs/{}", rel_path);
            let f = Path::new(&ff);
            if let Some(dir) = f.parent() {
                if !dir.exists() {
                    fs::create_dir_all(dir).unwrap();
                }
                fs::copy(path, f).unwrap();
            }
        }
    };
    let base = Path::new("./vendor/PathOfBuilding/src");
    visit_dirs(&base, &base, &mut f)?;

    let base = Path::new("./vendor/PathOfBuilding/runtime/lua");
    visit_dirs(&base, &base, &mut f)
}
