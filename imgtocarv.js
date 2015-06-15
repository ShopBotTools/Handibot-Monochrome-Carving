/**
 * Written by Alex Canales for ShopBotTools, Inc.
 */

//TODO: do a margin for the smooth and the hard edge
//TODO: Explain better what is marginEdge (find a better name too):
//      the variable represents the percentage where two "pixels" should be
//      considered as the continuation of a path or completly different.
//      Example: One pixel has 0.5 and an other 1. If marginEdge is set to
//      more than or equal 0.5, the will be a smooth slope between the two pixels
//      else there will be no slope.
//
//      __                   __
//     |  |__               |  \__
//     |     |              |     |
//      1  0.5               1  0.5
//     marginEdge < 0.5   marginEdge >= 0.5

//TODO: do it more "OOP"
var configuration = {
    pixelToInch : 1,
    bitDiameter : 1,
    maxCarvingDepth : 1,
    marginEdge : 0,
    type : "pixelized"
}

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
 *   table (array of number) wich represents the percentage
 */
function getTablePercentage(source, pixelToInch, bitDiameter) {
    var tab = [];  //TABle for the percentage
    var img = new Image();
    img.src = source;
    //TODO: wait the end of the image loading
    var imageData = context.getImageData(0, 0, myImage.width, myImage.height);
    if(img.width*pixelToInch < bitDiameter || img.height*pixelToInch < bitDiameter)
    {
        return { width : 0, height : 0, table : [] };
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

    return { width : iTab, height : jTab, table : tab };
}

/**
 * Returns the real X center position of the nth element of the table.
 *
 * @param {object} table The percentage table
 * @param {number} n The index in the table
 * @param {number} cellSize The size of a cell
 * @return {number} The X position
 */
//TODO: tester
function getRealX(table, n, cellSize) {
    return n % table.width * cellSize + cellSize / 2;
}

/**
 * Returns the real Y center position of the nth element of the table.
 *
 * @param {object} table The percentage table
 * @param {number} n The index in the table
 * @param {number} cellSize The size of a cell
 * @return {number} The Y position
 */
//TODO: tester
function getRealY(table, n, cellSize) {
    console.log("n: " + n +" => " +(table.height - 1 - parseInt(n / table.width)) * cellSize + cellSize / 2);
    //Because screen position is not real, we use table.height
    return (table.height - 1 - parseInt(n / table.width)) * cellSize + cellSize / 2;
}


//TODO: tester
function getRealZ(percentage, config) {
    return -(percentage * config.maxCarvingDepth);
}

//TODO: tester
function percentagesEqual(percentage1, percentage2, config) {
    return (Math.abs(percentage1 - percentage2) <= config.marginEdge);
}

//Do a stupid path like a printer  (doing it recursively?)
function getPixelizedPaths(table, config) {
    var paths = [];
    var sX = -1, sY = -1, sZ = -1; //Start point
    var currentPercentage = -1;
    var n;

    for(n = 0; n < table.table.length; n++) {
        //Start a path
        if(currentPercentage == -1 && table.table[n] != 0) {
            currentPercentage = table.table[n];
            sX = getRealX(table, n, config.bitDiameter);
            sY = getRealY(table, n, config.bitDiameter);
            sZ = getRealZ(currentPercentage, config);
            continue;
        }
        //Continue the same path
        if(sY == getRealY(table, n , config.bitDiameter) &&
                percentagesEqual(table.table[n], currentPercentage, config))
            continue;

        //Path discontinued
        paths.push({
            startX : sX,
            startY : sY,
            startZ : sZ,
            endX : getRealX(table, n-1, config.bitDiameter),
            endY : getRealY(table, n-1, config.bitDiameter),
            endZ : getRealZ(table.table[n-1], config)
        });
        currentPercentage = -1;
        if(table.table[n] == 0)
            continue;
        n--;  //like that it will go to the previous tests
    }

    if(sX != -1) {  //Because we can miss the last path
        paths.push({
            startX : sX,
            startY : sY,
            startZ : sZ,
            endX : getRealX(table, n-1, config.bitDiameter),
            endY : getRealY(table, n-1, config.bitDiameter),
            endZ : getRealZ(table.table[n-1], config)
        });
    }

    return paths;
}

function getGCode(paths) {
}

function imgToCarv(source, config)
{
    var table = getTablePercentage(source, config.pixelToInch, config.bitDiameter);
    //TODO: do something very simple: find the paths (don't care about right angle)
    var paths = [];
    if(config.type == "pixelized")
        paths = getPixelizedPaths(table, config);

    return getGCode(paths);
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

console.log(getTablePercentage("image.png", 1, 0.5));
console.log(getTablePercentage("image.png", 1, 1));
console.log(getTablePercentage("image.png", 1, 2));
console.log(getAverage(imageData, 0, 0, 2, 2));

var table = getTablePercentage("image.png", 1, 1);
console.log(getPixelizedPaths(table, configuration));
