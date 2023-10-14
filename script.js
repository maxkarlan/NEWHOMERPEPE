let images = [null, null, null, null, null];
const transparencyThreshold = 128;
const numOfStreams = 900;
let imgCenter; 
let pointImageOverlapCache = {};  
let circleDiameter;
let streamGroups = [];

function preload() {
    circleDiameter = Math.min(windowWidth, windowHeight);
    let desiredImageHeight = circleDiameter * 2;

    for (let i = 0; i < 5; i++) {
        loadImage(`images/image${i + 1}.png`, img => {
            let scaleFactor = desiredImageHeight / img.height;
            img.resize(img.width * scaleFactor, img.height * scaleFactor);
            images[i] = img;
        });
    }
}

function windowResized() {
    // Resize the canvas to the new window width and height
    resizeCanvas(windowWidth, windowHeight);

    // Recompute any parameters that depend on the window size
    circleDiameter = Math.min(windowWidth, windowHeight);
    let desiredImageHeight = circleDiameter * 2;
    
    for (let i = 0; i < images.length; i++) {
        let img = images[i];
        if (img) {
            let scaleFactor = desiredImageHeight / img.height;
            img.resize(img.width * scaleFactor, img.height * scaleFactor);
        }
    }
    
    // Update center coordinates
    imgCenter.set(width / 2, height / 2);
}

function setup() {
    createCanvas(windowWidth, windowHeight);
    imgCenter = createVector(width / 2, height / 2);  // Compute center once
    background(135, 206, 235);

    const colors = [
        [0, 96, 0],
        [96, 216, 0],
        [255, 253, 208],
        [145, 56, 49],
        [53, 57, 53]
    ];
    const percentages = [0.6, 0.2, 0.1, 0.05, 0.05];
    streamGroups = [];

    for (let j = 0; j < 5; j++) {
        let streams = [];
        let streamCountForImage = Math.round(numOfStreams * percentages[j]);
        for (let i = 0; i < streamCountForImage; i++) {
            streams.push(new Stream(colors[j], j));
        }
        streamGroups.push(streams);
    }
}

function isOverAnyImageCached(point) {
let cacheKey = `${point.x},${point.y}`;

// Use the cached result if available
if (pointImageOverlapCache.hasOwnProperty(cacheKey)) {
return pointImageOverlapCache[cacheKey];
}

let result = isOverAnyImage(point);
pointImageOverlapCache[cacheKey] = result;  // Cache the result

return result;
}

function draw() {


background(135, 206, 235);
pointImageOverlapCache = {};  // Clear the cache for each frame
drawTransparentCircle();	

for (let streams of streamGroups) {
for (let s of streams) {
    s.update();
    s.display();
}
}
}

function drawTransparentCircle() {
// Transparent circle style
fill(255, 0); // White color with 60% transparency
noStroke();

// Drawing the circle at the center of the canvas
ellipse(width / 2, height / 2, circleDiameter);
}

function mousePressed() {
for (let streams of streamGroups) {
for (let s of streams) {
    s.changeMode();
}
}
}



class Stream {
    constructor(color, assignedImageIdx) {
        this.color = color;
        this.points = [];
        this.noiseOffset = random(1000);
        this.currentAngle = random(TWO_PI);
        this.attractMode = false;
        this.assignedImageIdx = assignedImageIdx;
        this.insideImage = false;
        this.initStream();
          this.insideImage = false;
    }

    changeMode() {
        this.attractMode = !this.attractMode;
    }
  
      isOverAnyImage(point) {
                return isOverAnyImageCached(point);  // Use the cached function instead
                }

    initStream() {
        let startX = random(width);
        let startY = random(height);

        while (this.isOverAnyImage(createVector(startX, startY))) {
            startX = random(width);
            startY = random(height);
        }

        this.points.push(createVector(startX, startY));
    }

    isOutsideAllImages(point) {
        return !this.isOverAnyImage(point);
    }

    isOverAnyImage(point) {
        for (let img of images) {
            if (this.isOverImage(point, img)) return true;
        }
        return false;
    }

    isOverAssignedImage(point) {
        return this.isOverImage(point, images[this.assignedImageIdx]);
    }

    isOverImage(point, img) {
        let imgX = point.x - (width / 2 - img.width / 2);
        let imgY = point.y - (height / 2 - img.height / 2);
        if (imgX >= 0 && imgX < img.width && imgY >= 0 && imgY < img.height) {
            let pixelColor = img.get(imgX, imgY);
            return alpha(pixelColor) > transparencyThreshold;
        }
        return false;
    }
  
      stayWithinBounds(point) {
const buffer = 5;  // Small buffer to ensure that the stream doesn't touch the edge
if (point.x <= buffer || point.x >= width - buffer) {
this.currentAngle = PI - this.currentAngle;  // Reflect horizontally
}
if (point.y <= buffer || point.y >= height - buffer) {
this.currentAngle = -this.currentAngle;  // Reflect vertically
}
}

update() {
let lastPoint = this.points[this.points.length - 1];
let newPoint;

let speed = this.attractMode ? 8 : 8; // Double the speed when attractMode is on

if (this.attractMode) {
if (this.isOutsideAllImages(lastPoint) || this.insideImage || this.isOverAssignedImage(lastPoint)) {
    this.currentAngle = this.calculateAngleTowardsImage(lastPoint, this.assignedImageIdx);
}
} else {
if (this.isOverAnyImage(lastPoint)) {
    // Repulsion mechanism: If point is inside any image, move away from the image center
    this.currentAngle = this.calculateAngleAwayFromClosestImageCenter(lastPoint);
}
}

let angleVariation = map(noise(this.noiseOffset), 0, 1, -PI / 2, PI / 2);
this.currentAngle += angleVariation;

newPoint = p5.Vector.fromAngle(this.currentAngle).mult(speed).add(lastPoint);  // Using the speed variable here

// If in attractMode and inside assigned image, check if the new point is outside
if (this.attractMode && this.insideImage && !this.isOverAssignedImage(newPoint)) {
this.currentAngle += PI; // Flip direction
newPoint = p5.Vector.fromAngle(this.currentAngle).mult(speed).add(lastPoint); // Using the speed variable here too
}

this.stayWithinBounds(newPoint);  // Check and adjust for bounds

this.points.push(newPoint);
this.noiseOffset += 0.1;

if (this.points.length > 100) {
this.points.shift();
}

// Update the insideImage flag based on the last point
this.insideImage = this.isOverAssignedImage(lastPoint);
}

    calculateAngleAwayFromClosestImageCenter(point) {
        let closestDistance = Infinity;
        let closestImageCenter;

        for (let img of images) {
            let distance = dist(point.x, point.y, imgCenter.x, imgCenter.y);
            if (distance < closestDistance && this.isOverImage(point, img)) {
                closestDistance = distance;
                closestImageCenter = imgCenter;
            }
        }

        if (closestImageCenter) {
            return p5.Vector.sub(point, closestImageCenter).heading();
        }
        
        return random(TWO_PI);
    }

    calculateAngleTowardsImage(point, imgIdx) {
        if (this.insideImage) {
            return random(TWO_PI);
        }
        let angleTowardsImage = p5.Vector.sub(imgCenter, point).heading();
        return angleTowardsImage;
    }

    display() {
        noFill();
        stroke(this.color);
        strokeWeight(.5);
        beginShape();
        for (let pt of this.points) {
            vertex(pt.x, pt.y)
        }
        endShape();
    }
}