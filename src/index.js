import WorldWind from '@nasaworldwind/worldwind';
import TexturedSurfacePolygon from './TexturedSurfacePolygon';

const wwd = new WorldWind.WorldWindow('canvasOne');
wwd.navigator.lookAtLocation.latitude = 50;
wwd.navigator.lookAtLocation.longitude = 0;
wwd.navigator.range = 2830000;

const bmngLayer = new WorldWind.BMNGLayer();
const shapesLayer = new WorldWind.RenderableLayer('Surface Shapes');

wwd.addLayer(bmngLayer);
wwd.addLayer(shapesLayer);

const attributes = new WorldWind.ShapeAttributes(null);
attributes.drawOutline = false;
attributes.interiorColor = new WorldWind.Color(0, 1, 1, 0.5);

const boundary = [
    new WorldWind.Location(50.895195, -4.086130),
    new WorldWind.Location(51.297443, -0.455342),
    new WorldWind.Location(49.682980, -0.068631),
    new WorldWind.Location(49.282902, -3.575818),
    new WorldWind.Location(50.895195, -4.086130),
];

const shape = new TexturedSurfacePolygon(boundary, attributes);
shapesLayer.addRenderable(shape);

wwd.redraw();

let shapeImage = null;

const toggleImageButton = document.querySelector('#toggle-image');
toggleImageButton.addEventListener('click', onToggleClick, false);

function onToggleClick() {
    if (shape.image) {
        shape.image = null;
    }
    else {
        shape.image = shapeImage;
    }
    wwd.redraw();
}

const fileSelector = document.querySelector('#file-input');
fileSelector.addEventListener('change', onFileSelected, false);

function onFileSelected(event) {
    const file = event.target.files[0];

    if (!file) {
        return;
    }

    readFileAsDataUrl(file)
        .then(createImage)
        .then(image => {
            shape.image = image;
            shapeImage = image;
            wwd.redraw();
        })
        .catch(err => console.error(err));

}

function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = function () {
            resolve(this.result);
        };

        reader.onerror = function () {
            reject(new Error('Can not read file'));
        };

        reader.readAsDataURL(file)
    });
}

function createImage(url) {
    return new Promise((resolve, reject) => {
        const image = new Image();

        image.onload = function () {
            resolve(this);
        };

        image.onerror = function () {
            reject(new Error('Can not load image from url ' + url));
        };

        image.crossOrigin = 'Anonymus';
        image.src = url;
    });
}