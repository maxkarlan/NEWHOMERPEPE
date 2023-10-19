let images = [null, null, null, null, null, null];
const transparencyThreshold = 128;
const numOfStreams = 3000;
let imgCenter; 
let pointImageOverlapCache = {};  
let circleDiameter;
let streamGroups = [];
let desiredStreamCounts = [];
let totalStreamsToGenerate = 0;
const REF_AREA = 1920 * 1080;  // Assuming 1920x1080 as the reference resolution where numOfStreams was 900.
const BASE_SPEED = .01;  // the basic speed when there's just one stream
const LOG_SCALE_FACTOR = .95;  // scaling factor for logarithmic relationship
//const SPEED_INCREMENT = 0.01;  // the amount of speed to be added for each additional stream


function preload() {
    circleDiameter = Math.min(windowWidth, windowHeight);
    let desiredImageHeight = circleDiameter * 2;

    for (let i = 0; i < 6; i++) {
        loadImage(`images/image${i + 1}.png`, img => {
            let scaleFactor = desiredImageHeight / img.height;
            img.resize(img.width * scaleFactor, img.height * scaleFactor);
            images[i] = img;
        });
    }
}

function getCurrentAttractMode() {
    // If no streams exist, default to true
    if (streamGroups.length === 0 || streamGroups[0].length === 0) {
        return true;
    }
    return streamGroups[0][0].attractMode;
}

function generateStreams() {
    // Compute the ratio of the current window area to the reference area
    let areaRatio = (windowWidth * windowHeight) / REF_AREA;
    
    // Adjust numOfStreams based on the ratio
    let adjustedNumOfStreams = Math.round(numOfStreams * areaRatio);

    const percentages = [0.5, 0.175, 0.105, .095, 0.05, 0.075];
    desiredStreamCounts = [];

    for (let j = 0; j < 6; j++) {
        let desiredCountForImage = Math.round(adjustedNumOfStreams * percentages[j]);
        desiredStreamCounts.push(desiredCountForImage);
    }
    
    totalStreamsToGenerate = adjustedNumOfStreams;
}


function setup() {

    for (let i = 0; i < 6; i++) {
        streamGroups.push([]);
    }

    createCanvas(windowWidth, windowHeight);
    imgCenter = createVector(width / 2, height / 2);
    background(135, 206, 235);

    generateStreams();  // Generate streams based on window size
}

function windowResized() {
    // Resize the canvas to the new window width and height
    resizeCanvas(windowWidth, windowHeight);
    imgCenter.set(width / 2, height / 2);  // Reset the center as the window has been resized

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
    
    generateStreams();  // Regenerate streams based on new window size
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

    adjustStreams();  // Adjust the number of streams

    for (let streams of streamGroups) {
        for (let s of streams) {
            s.update();
            s.display();
        }
    }
    
    displayStreamCount();
}

// New function to adjust the number of streams
function adjustStreams() {
    const colors = [
        [0, 96, 0],
        [96, 216, 0],
        [255, 253, 208],
        [255, 253, 208],
        [145, 56, 49],
        [53, 57, 53]
    ];

    for (let j = 0; j < 6; j++) {
        while (streamGroups[j].length < desiredStreamCounts[j]) {
            // Sample a point from an existing stream if available
            let samplePoint = streamGroups[j].length > 0 ? random(random(streamGroups[j]).points) : null;

            // Add a stream with the sampled point
            streamGroups[j].push(new Stream(colors[j], j, samplePoint));
        }

        while (streamGroups[j].length > desiredStreamCounts[j]) {
            // Start fading the last stream
            streamGroups[j][streamGroups[j].length - 1].fade();
            
            // Remove the stream if it's fully faded
            if(streamGroups[j][streamGroups[j].length - 1].alpha <= 0) {
                streamGroups[j].pop();
            } else {
                break; // Only fade one stream at a time for smoother effect
            }
        }
        
    }
}

// New function to compute and display the stream count
function displayStreamCount() {
let totalStreams = 0;
for (let streams of streamGroups) {
    totalStreams += streams.length;
}

push(); // Save current drawing settings
fill(0);  // Black text color
textSize(16);  // Set text size
textAlign(RIGHT, TOP);  // Align text to top right
text(`Streams: ${totalStreams}`, width - 10, 10);  // Display count with a 10px margin from the edges
pop(); // Restore original drawing settings
}

function drawTransparentCircle() {
// Transparent circle style
fill(255, 0); // White color with 60% transparency
noStroke();

// Drawing the circle at the center of the canvas
ellipse(width / 2, height / 2, circleDiameter);
}

function isInsideCircle(point) {
    return dist(point.x, point.y, imgCenter.x, imgCenter.y) <= circleDiameter / 2;
}

function mousePressed() {
for (let streams of streamGroups) {
for (let s of streams) {
    s.changeMode();
}
}
}



class Stream {
    constructor(color, assignedImageIdx, startPoint = null) {
        this.color = color;
        this.points = [];
        this.noiseOffset = random(1000);
        this.currentAngle = random(TWO_PI);
        this.attractMode = getCurrentAttractMode();
        this.assignedImageIdx = assignedImageIdx;
        this.initStream(startPoint);
        this.insideImage = this.isOverAssignedImage(this.points[0]);
        this.alpha = 255;
    }
    

    changeMode() {
        this.attractMode = !this.attractMode;
    }

    fade() {
        this.alpha -= 200;  // Decrement by 5 for a moderate fading speed. Adjust as needed.
    }
  
      isOverAnyImage(point) {
                return isOverAnyImageCached(point);  // Use the cached function instead
                }

                initStream(startPoint = null) {
                    if (startPoint) {
                        this.points.push(startPoint);
                    } else {
                        let startX = random(width);
                        let startY = random(height);
            
                        while (this.isOverAnyImage(createVector(startX, startY))) {
                            startX = random(width);
                            startY = random(height);
                        }
            
                        this.points.push(createVector(startX, startY));
                    }
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
            return alpha(pixelColor) > transparencyThreshold && isInsideCircle(point);
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

get totalStreamsCount() {
    let totalStreams = 0;
    for (let streams of streamGroups) {
        totalStreams += streams.length;
    }
    return totalStreams;
}

update() {
let lastPoint = this.points[this.points.length - 1];
let newPoint;


        // Calculate the speed for attractMode based on total streams count using logarithmic relationship
        let speed = this.attractMode ? BASE_SPEED + LOG_SCALE_FACTOR * Math.log(this.totalStreamsCount + 1) : 12;

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

let angleVariation = map(noise(this.noiseOffset), 0, 1, -PI, PI);
this.currentAngle += angleVariation;

newPoint = p5.Vector.fromAngle(this.currentAngle).mult(speed).add(lastPoint);  // Using the speed variable here

// If in attractMode and inside assigned image, check if the new point is outside
if (this.attractMode && this.insideImage && !this.isOverAssignedImage(newPoint)) {
this.currentAngle += PI; // Flip direction
newPoint = p5.Vector.fromAngle(this.currentAngle).mult(speed).add(lastPoint); // Using the speed variable here too
}

this.stayWithinBounds(newPoint);  // Check and adjust for bounds

this.points.push(newPoint);
this.noiseOffset += 0.005;

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
        stroke(this.color[0], this.color[1], this.color[2], this.alpha);
        strokeWeight(.2);
        beginShape();
        for (let pt of this.points) {
            vertex(pt.x, pt.y)
        }
        endShape();
    }
}