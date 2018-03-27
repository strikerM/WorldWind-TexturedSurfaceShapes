import TexturedSurfaceShape from './TexturedSurfaceShape';
import WorldWind from '@nasaworldwind/worldwind';

export default class TexturedSurfacePolygon extends TexturedSurfaceShape {

    static staticStateKey(shape) {
        return TexturedSurfaceShape.staticStateKey(shape) + " pg " + shape._stateId;
    }

    constructor(boundaries, attributes) {
        super(attributes);

        if (!Array.isArray(boundaries)) {
            throw new Error('TexturedSurfacePolygon - constructor - The specified boundary is not an array.');

        }

        this._boundaries = boundaries;
        this._stateId = WorldWind.SurfacePolygon.stateId++;
    }

    get boundaries() {
        return this._boundaries;
    }

    set boundaries(boundaries) {
        if (!Array.isArray(boundaries)) {
            throw new Error('TexturedSurfacePolygon - set boundaries - The specified boundary is not an array.');
        }
        this.resetBoundaries();
        this._boundaries = boundaries;
        this._stateId = WorldWind.SurfacePolygon.stateId++;
        this.stateKeyInvalid = true;
    }

    computeStateKey() {
        return TexturedSurfacePolygon.staticStateKey(this);
    }

    computeBoundaries(dc) {

    }

}