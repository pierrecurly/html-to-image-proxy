import { embedResources } from './embed-resources';
import { toArray } from './util';
import { isDataUrl, resourceToDataURL } from './dataurl';
import { getMimeType } from './mimes';
const proxy = (src, options) => {
    const proxy = options.proxy;
    if (!proxy) {
        throw new Error('No proxy defined');
    }
    return new Promise((resolve, reject) => {
        const responseType = 'blob';
        const xhr = new XMLHttpRequest();
        xhr.onload = () => {
            if (xhr.status === 200) {
                const reader = new FileReader();
                reader.addEventListener('load', () => resolve(reader.result), false);
                reader.addEventListener('error', (e) => reject(e), false);
                reader.readAsDataURL(xhr.response);
            }
            else {
                reject(new Error('Failed to proxy resource'));
            }
        };
        xhr.onerror = reject;
        const queryString = proxy.indexOf('?') > -1 ? '&' : '?';
        xhr.open('GET', `${proxy}${queryString}url=${encodeURIComponent(src)}&responseType=${responseType}`);
        if (xhr instanceof XMLHttpRequest) {
            xhr.responseType = responseType;
        }
        xhr.send();
    });
};
async function embedBackground(clonedNode, options) {
    var _a;
    const background = (_a = clonedNode.style) === null || _a === void 0 ? void 0 : _a.getPropertyValue('background');
    if (background) {
        const cssString = await embedResources(background, null, options);
        clonedNode.style.setProperty('background', cssString, clonedNode.style.getPropertyPriority('background'));
    }
}
async function embedImageNode(clonedNode, options) {
    if (!(clonedNode instanceof HTMLImageElement && !isDataUrl(clonedNode.src)) &&
        !(clonedNode instanceof SVGImageElement &&
            !isDataUrl(clonedNode.href.baseVal))) {
        return;
    }
    const url = clonedNode instanceof HTMLImageElement
        ? clonedNode.src
        : clonedNode.href.baseVal;
    let dataURL = '';
    if (options.proxy) {
        dataURL = await proxy(url, options);
    }
    else {
        dataURL = await resourceToDataURL(url, getMimeType(url), options);
    }
    await new Promise((resolve, reject) => {
        clonedNode.onload = resolve;
        clonedNode.onerror = reject;
        if (clonedNode instanceof HTMLImageElement) {
            clonedNode.srcset = '';
            clonedNode.src = dataURL;
        }
        else {
            clonedNode.href.baseVal = dataURL;
        }
    });
}
async function embedChildren(clonedNode, options) {
    const children = toArray(clonedNode.childNodes);
    const deferreds = children.map((child) => embedImages(child, options));
    await Promise.all(deferreds).then(() => clonedNode);
}
export async function embedImages(clonedNode, options) {
    if (clonedNode instanceof Element) {
        await embedBackground(clonedNode, options);
        await embedImageNode(clonedNode, options);
        await embedChildren(clonedNode, options);
    }
}
//# sourceMappingURL=embed-images.js.map