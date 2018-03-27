import WorldWind from '@nasaworldwind/worldwind';

/**
 * If no image is set, it behaves tha same as a SurfaceShape.
 * To set an image pass it to the shape .image property (myShape.image = myImg;)
 * 
 * Limitations with an image:
 * The boundaries have to define a quadrilateral (can be defined by 4 corners)
 * If the edges arc over the globe, the interior will not be filled properly
 * Shapes that cross the anti-meridian will not use the image
 * Performance is lower
 * 
 * When used with an image it will divide the image in cells (based on the step, maxImageWidth, maxImageHeight values)
 * and draw each image cell to the canvas
 * This is a slow operation, try to keep the number of cells "low"
 * For example:
 * step = 1, maxImageWidth = 64, maxImageHeight = 64
 * will produce 4096 (64 * 64 * 1) cells 
 */
export default class TexturedSurfaceShape extends WorldWind.SurfaceShape {

    static offScreenCanvas() {
        if (!TexturedSurfaceShape.canvas) {
            TexturedSurfaceShape.canvas = document.createElement('canvas');
        }
        return TexturedSurfaceShape.canvas;
    }

    static offScreenCtx() {
        if (!TexturedSurfaceShape.ctx) {
            const canvas = TexturedSurfaceShape.offScreenCanvas();
            TexturedSurfaceShape.ctx = canvas.getContext('2d');
        }
        return TexturedSurfaceShape.ctx;
    }

    constructor(attributes) {
        super(attributes);

        this._image = null;

        /**
        * Determines the division step of the image
        * Lower numbers produce better textures at the expense of performance
        * @type {Number}
        */
        this.step = 1;

        /**
        * Resizes the image
        * Higher numbers produce better textures at the expense of performance
        * @type {Number}
        */
        this.maxImageWidth = 64;
        this.maxImageHeight = 64;
    }

    /**
     * @return {HTMLImageElement|null}
     */
    get image() {
        return this._image;
    }

    /**
     * @param {HTMLImageElement} img
     */
    set image(img) {
        this._image = img;
        this.stateKeyInvalid = true;
        this._stateId = WorldWind.SurfacePolygon.stateId++;
    }

    renderToTexture(dc, ctx2D, xScale, yScale, dx, dy) {
        const attributes = (this._highlighted ? (this._highlightAttributes || this._attributes) : this._attributes);
        const drawInterior = (!this._isInteriorInhibited && attributes.drawInterior);
        const drawOutline = (attributes.drawOutline && attributes.outlineWidth > 0);
        let pickColor;

        if (!drawInterior && !drawOutline) {
            return;
        }

        if (dc.pickingMode && !this.pickColor) {
            this.pickColor = dc.uniquePickColor();
        }

        if (dc.pickingMode) {
            pickColor = this.pickColor.toHexString();
        }

        if (this.crossesAntiMeridian || this.containsPole) {
            if (drawInterior) {
                this.draw(this._interiorGeometry, ctx2D, xScale, yScale, dx, dy);
                ctx2D.fillStyle = dc.pickingMode ? pickColor : attributes.interiorColor.toRGBAString();
                ctx2D.fill();
            }
            if (drawOutline) {
                this.draw(this._outlineGeometry, ctx2D, xScale, yScale, dx, dy);
                ctx2D.lineWidth = attributes.outlineWidth;
                ctx2D.strokeStyle = dc.pickingMode ? pickColor : attributes.outlineColor.toRGBAString();
                ctx2D.stroke();
            }
        }
        else {
            if (this.image && !dc.pickingMode) {
                ctx2D.save();
            }
            const points = this._interiorGeometry[0].map(location => ({
                x: location.longitude * xScale + dx,
                y: location.latitude * yScale + dy
            }));
            this.drawPoints(points, ctx2D);
            if (drawInterior) {
                if (this.image && !dc.pickingMode) {
                    ctx2D.clip();
                    this.drawImageToPolygon(ctx2D, this.image, points);
                    ctx2D.restore();
                }
                else {
                    ctx2D.fillStyle = dc.pickingMode ? pickColor : attributes.interiorColor.toRGBAString();
                    ctx2D.fill();
                }
            }
            if (drawOutline) {
                ctx2D.lineWidth = attributes.outlineWidth;
                ctx2D.strokeStyle = dc.pickingMode ? pickColor : attributes.outlineColor.toRGBAString();
                ctx2D.stroke();
            }
        }

        if (dc.pickingMode) {
            const po = new WorldWind.PickedObject(this.pickColor.clone(), this.pickDelegate ? this.pickDelegate : this,
                null, this.layer, false);
            dc.resolvePick(po);
        }
    }

    drawPoints(points, ctx2D, allowOverDraw) {
        ctx2D.beginPath();
        ctx2D.moveTo(points[0].x, points[0].y);
        for (var i = 1, len = points.length; i < len; i++) {
            ctx2D.lineTo(points[i].x, points[i].y);
        }
    }

    drawImageToPolygon(ctx, image, points) {
        const canvasWidth = ctx.canvas.width;
        const canvasHeight = ctx.canvas.height;
        
        const offScreenCanvas = TexturedSurfaceShape.offScreenCanvas();
        const offScreenCtx = TexturedSurfaceShape.offScreenCtx();

        const corners = this.getCorners(points);
        const axesDim = this.getAxesDimensions(corners);

        const offScreenWidth = Math.min(axesDim.distX, this.maxImageWidth);
        const offScreenHeight = Math.min(axesDim.distY, this.maxImageHeight);

        offScreenCanvas.width = offScreenWidth;
        offScreenCanvas.height = offScreenHeight;
        offScreenCtx.drawImage(image, 0, 0, offScreenWidth, offScreenHeight);

        const step = this.step;
        const width = offScreenWidth - 1;
        const height = offScreenHeight - 1;
        let topLeft, topRight, bottomRight, bottomLeft, y1Current, y2Current, y1Next, y2Next;

        for (var y = 0; y < height; y += step) {
            y1Current = this.lerp(corners[0], corners[3], y / height);
            y2Current = this.lerp(corners[1], corners[2], y / height);
            y1Next = this.lerp(corners[0], corners[3], (y + step) / height);
            y2Next = this.lerp(corners[1], corners[2], (y + step) / height);

            for (var x = 0; x < width; x += step) {
                topLeft = this.lerp(y1Current, y2Current, x / width);
                topRight = this.lerp(y1Current, y2Current, (x + step) / width);
                bottomRight = this.lerp(y1Next, y2Next, (x + step) / width);
                bottomLeft = this.lerp(y1Next, y2Next, x / width);

                var dWidth = Math.ceil(Math.max(step, Math.abs(topRight.x - topLeft.x), Math.abs(bottomLeft.x - bottomRight.x))) + 1;
                var dHeight = Math.ceil(Math.max(step, Math.abs(topLeft.y - bottomLeft.y), Math.abs(topRight.y - bottomRight.y))) + 1;

                if (this.isRectInsideCanvas(topLeft, dWidth, dHeight, canvasWidth, canvasHeight)) {
                    ctx.drawImage(offScreenCanvas, x, y, step, step, topLeft.x, topLeft.y, dWidth, dHeight);
                }
            }
        }
    }

    getCorners(points, bbox) {
        bbox = bbox || this.getBbox(points);

        const edgePoints = points.filter(point => this.isEdgePoint(point, bbox));

        if (edgePoints.length === 5 &&
            this.arePointsEqual(edgePoints[0], edgePoints[edgePoints.length - 1])) {
            edgePoints.length = 4;
        }

        if (edgePoints.length > 4) {
            const leftPoints = edgePoints.filter(point => point.x === bbox.minX);
            const rightPoints = edgePoints.filter(point => point.x === bbox.maxX);

            const { top: topLeft, bottom: bottomLeft } = this.getTopBottom(leftPoints);
            const { top: topRight, bottom: bottomRight } = this.getTopBottom(rightPoints);

            return [topLeft, topRight, bottomRight, bottomLeft];
        }

        const slope1 = this.getSlope(edgePoints[0], edgePoints[2]);
        const slope2 = this.getSlope(edgePoints[1], edgePoints[3]);
        const topLeftPoint = this.getTopLeftPoint(slope1, edgePoints[0], edgePoints[2]) ||
            this.getTopLeftPoint(slope2, edgePoints[1], edgePoints[3]);

        if (!topLeftPoint) {
            console.log('Could not determine top left corner with the slope method');
            return edgePoints;
        }

        const topLeftIndex = edgePoints.findIndex(point => point.x === topLeftPoint.x && point.y === topLeftPoint.y);
        const newCorners = [];
        for (var i = topLeftIndex; i < edgePoints.length + topLeftIndex; i++) {
            newCorners.push(edgePoints[i % edgePoints.length]);
        }

        return newCorners;
    }

    getBbox(points) {
        const bbox = {
            minX: Number.MAX_SAFE_INTEGER,
            maxX: Number.MIN_SAFE_INTEGER,
            minY: Number.MAX_SAFE_INTEGER,
            maxY: Number.MIN_SAFE_INTEGER,
        };

        return points.reduce((bbox, point) => {
            bbox.minX = Math.min(bbox.minX, point.x);
            bbox.maxX = Math.max(bbox.maxX, point.x);
            bbox.minY = Math.min(bbox.minY, point.y);
            bbox.maxY = Math.max(bbox.maxY, point.y);

            return bbox;
        }, bbox);
    }

    getTopBottom(points) {
        return points.reduce((acc, point) => {
            if (point.y < acc.top.y) {
                acc.top = point;
            }

            if (point.y > acc.bottom.y) {
                acc.bottom = point;
            }

            return acc;
        }, { top: points[0], bottom: points[0] });
    }

    distance(p1, p2) {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    isEdgePoint(point, bbox) {
        return (
            point.x === bbox.minX || point.x === bbox.maxX ||
            point.y === bbox.minY || point.y === bbox.maxY
        );
    }

    arePointsEqual(p1, p2) {
        return p1.x === p2.x && p1.y === p2.y;
    }

    getSlope(p1, p2) {
        return (p1.y - p2.y) / (p1.x - p2.x);
    }

    getTopLeftPoint(slope, point1, point2) {
        if (slope <= 0) {
            return null;
        }

        if (point1.y < point2.y) {
            return point1;
        }

        return point2;
    }

    getAxesDimensions(corners) {
        const dx = Math.abs(corners[0].x - corners[1].x);
        const dy = Math.abs(corners[0].y - corners[1].y);

        let distX = 0;
        let distY = 0;

        if (dx > dy) {
            distX = this.distance(corners[0], corners[1]);
            distY = this.distance(corners[0], corners[3]);
        }
        else {
            distX = this.distance(corners[0], corners[3]);
            distY = this.distance(corners[0], corners[1]);
        }

        return { distX, distY };
    }

    lerp(p1, p2, t) {
        return {
            x: p1.x + (p2.x - p1.x) * t,
            y: p1.y + (p2.y - p1.y) * t
        };
    }

    isRectInsideCanvas(point, width, height, canvasWidth, canvasHeight) {
        return (
            point.x + width >= 0 &&
            point.x <= canvasWidth &&
            point.y + height >= 0 &&
            point.y < canvasHeight
        );
    }

}