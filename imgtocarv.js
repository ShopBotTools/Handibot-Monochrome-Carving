/**
 * Written by Alex Canales for ShopBotTools, Inc.
 */

/**
 * Returns the percentage (0 to 1) of black in the pixel.
 *
 * @param {Image data} imageData The image data.
 * @param {number} i The line number.
 * @param {number} j The column number.
 * @return {number} The percentage (0 to 1) of black in the pixel.
 */
function getPercentage(imageData, i, j) {
    //1 px = [R, G, B, A]
    var px = parseInt(i) * imageData.width * 4 + parseInt(j) * 4;
    if(px >= imageData.data.length)
        return 0;
    return 1 - (imageData.data[px] / 255);  //Assuming R = G = B
}

/**
 * Returns the average percentage (0 to 1) of black in the area.
 *
 * @param {Image data} imageData The image data.
 * @param {number} iStart The start line number (include).
 * @param {number} jStart The start column number (include).
 * @param {number} iEnd The end line number (exclude).
 * @param {number} jEnd The end column number (exclude).
 * @return {number} The percentage (0 to 1) of black in the area.
 */
function getAverage(imageData, iStart, jStart, iEnd, jEnd) {
    var sum = 0, count = 0, i = 0, j = 0;

    //swapping
    if(iStart > iEnd) {
        iStart = iStart + iEnd;
        iEnd = iStart - iEnd;
        iStart = iStart - iEnd;
    }

    if(jStart > jEnd) {
        jStart = jStart + jEnd;
        jEnd = jStart - jEnd;
        jStart = jStart - jEnd;
    }

    for(i=iStart; i < imageData.width && i < iEnd; i++) {
        for(j=jStart; j < imageData.height && j < jEnd; j++) {
            sum += getPercentage(imageData, i, j);
            count++;
        }
    }

    return sum/count;
}

//TODO: change name and test
/**
 * Generate an array of carving percentage. Each cells have the size of the bit.
 *
 * @param {string} source The source of the image.
 * @param {number} pixelToInch The number of inches for a pixel.
 * @param {number} bitDiameter The bit diameter (in inches).
 * @return {object} An object with three members: width (number), height (number),
 *   map (array of number) wich represents the percentage
 */
function getMapPercentage(source, pixelToInch, bitDiameter) {
    var tab = [];  //TABle for the percentage
    var img = new Image();
    img.src = source;
    //TODO: wait the end of the image loading
    var imageData = context.getImageData(0, 0, myImage.width, myImage.height);
    if(img.width*pixelToInch < bitDiameter || img.height*pixelToInch < bitDiameter)
    {
        return { width : 0, height : 0, map : [] };
    }

    var delta = bitDiameter / pixelToInch;
    var iPx = 0, jPx = 0, iTab = 0, jTab = 0;

    for(iPx=0; iPx < img.width; iPx+=delta) {
        jTab = 0;
        for(jPx=0; jPx < img.height; jPx+=delta) {
            tab.push(getAverage(imageData, iPx, jPx, iPx+delta, jPx+delta));
            jTab++;
        }
        iTab++;
    }

    return { width : iTab, height : jTab, map : tab };
}

/**
 * Generate the GCode for carving the image. The image MUST be in grayscale.
 *
 * @param {string} source The source of the image.
 * @param {number} pixelToInch The number of inches for a pixel.
 * @param {number} maxCarvingDepth The maxmimum carving depth (in inches).
 * @param {number} bitDiameter The bit diameter (in inches).
 * @return {string} The GCode or an empty string if there is an error.
 */
function imgToCarv(source, pixelToInch, maxCarvingDepth, bitDiameter)
{

    //TODO: do something very simple: find the paths (don't care about right angle)
}

//TODO: delete all the tests when over
var myImage = new Image();
myImage.src = "image.png";
// myImage.src = "path3342.png";
var canvas = document.createElement('canvas');
canvas.width = myImage.width;
canvas.height = myImage.height;
var context = canvas.getContext('2d');
context.drawImage(myImage, 0, 0);
var imageData = context.getImageData(0, 0, myImage.width, myImage.height);
var pixels = context.getImageData(0, 0, myImage.width, myImage.height).data;

console.log(getMapPercentage("image.png", 1, 0.5));
console.log(getMapPercentage("image.png", 1, 1));
console.log(getMapPercentage("image.png", 1, 2));
console.log(getAverage(imageData, 0, 0, 2, 2));
