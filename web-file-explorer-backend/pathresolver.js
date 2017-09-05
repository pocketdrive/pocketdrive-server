export function pathGuard(path) {
    return path.replace(/\.\.\//g, '');
}