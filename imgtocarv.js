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
    loaded : false,
    pixelToInch : 1,
    bitDiameter : 1,
    maxCarvingDepth : 1,
    marginEdge : 0,
    type : "pixelized",
    safeZ : 3,
    bitLength : 2
};

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
 * @param {Image()} image The image.
 * @param {number} pixelToInch The number of inches for a pixel.
 * @param {number} bitDiameter The bit diameter (in inches).
 * @return {object} An object with three members: width (number), height (number),
 *   table (array of number) wich represents the percentage
 */
function getTablePercentage(image, pixelToInch, bitDiameter) {
    var tab = [];  //TABle for the percentage
    var imageData = context.getImageData(0, 0, myImage.width, myImage.height);

    if(image.width*pixelToInch < bitDiameter ||
        image.height*pixelToInch < bitDiameter)
    {
        return { width : 0, height : 0, table : [] };
    }

    var delta = bitDiameter / pixelToInch;
    var iPx = 0, jPx = 0, iTab = 0, jTab = 0;

    for(iPx=0; iPx < image.width; iPx+=delta) {
        jTab = 0;
        for(jPx=0; jPx < image.height; jPx+=delta) {
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
function getRealY(table, n, cellSize) {
    //Because screen position is not real, we use table.height
    return (table.height - 1 - parseInt(n / table.width)) * cellSize + cellSize / 2;
}

/**
 * Returns the real Z position of the nth element of the table.
 *
 * @param {number} percentage The percentage of carving
 * @param {object} config The configuration
 * @return {number} The Z position
 */
function getRealZ(percentage, config) {
    return -(percentage * config.maxCarvingDepth);
}

/**
 * Tests if the two percentages are "equal" or not.
 *
 * @param {number} percentage1 A percentage.
 * @param {number} percentage2 A percentage.
 * @param {object} config The configuration.
 * @return {boolean} Returns if the two percentages are "equal" or not.
 */
function hasToBeSmoothed(percentage1, percentage2, config) {
    return (Math.abs(percentage1 - percentage2) <= config.marginEdge);
}

function addPath(paths, startX, startY, startZ, endX, endY, endZ) {
    paths.push({
        "start" : { "x" : startX, "y" : startY, "z" : startZ },
        "end" : { "x" : endX, "y" : endY, "z" : endZ }
    });
}

//Do a stupid path like a printer  (doing it recursively?)
function getPixelizedPaths(config, table) {
    var paths = [];
    var sX = -1, sY = -1, sZ = -1, endN; //Start point
    var currentPercentage = -1;
    var n;

    for(n = 0; n < table.table.length; n++) {
        //Start a path
        if(currentPercentage === -1 && table.table[n] !== 0) {
            currentPercentage = table.table[n];
            sX = getRealX(table, n, config.bitDiameter);
            sY = getRealY(table, n, config.bitDiameter);
            sZ = getRealZ(currentPercentage, config);
            continue;
        }
        //Continue the same path
        if(sY == getRealY(table, n , config.bitDiameter) &&
                currentPercentage == table.table[n])
            continue;

        if(hasToBeSmoothed(table.table[n], currentPercentage, config))
            endN = n;
        else
            endN = n-1;

        //Path discontinued
        addPath(paths, sX, sY, sZ, getRealX(table, endN, config.bitDiameter),
                getRealY(table, endN, config.bitDiameter),
                getRealZ(table.table[endN], config));
        currentPercentage = -1;
        if(table.table[n] === 0)
            continue;
        n--;  //like that it will go to the previous tests
    }

    if(sX != -1) {  //Because we can miss the last path
        endN = table.table.length - 1;
        addPath(paths, sX, sY, sZ, getRealX(table, endN, config.bitDiameter),
                getRealY(table, endN, config.bitDiameter),
                getRealZ(table.table[endN], config));
    }

    return paths;
}

/**
 * Generate GCode for cutting from the start point to the end point.
 *
 * @param {object} config The configuration.
 * @param {object} path The path.
 * @return {string} The Gcode for this cut
 */
function getGCodeStraight(config, path) {
    var gcode = "";
    var z = 0;
    var startX = path.start.x.toFixed(5), startY = path.start.y.toFixed(5);
    var startZ = path.start.z.toFixed(5);
    var endX = path.end.x.toFixed(5), endY = path.end.y.toFixed(5);

    //Have to do multiple passes because of the height of the bit
    do {
        gcode += "(Go to the start cut position)\n";
        gcode += "G0 Z" + config.safeZ.toFixed(5) + "\n";
        gcode += "G0 X" + startX + " Y" + startY + "\n";
        z -= config.bitLength;
        if(z < path.end.z)
            z = path.end.z;
        gcode += "(One pass)\n";
        gcode += "G1 Z" + z.toFixed(5) + "\n";
        gcode += "G1 X" + endX + " Y" + endY + "\n";
    } while(z > path.end.z);
    gcode += "G0 Z" + config.safeZ.toFixed(5) + "\n";

    return gcode;
}

/**
 * Creates the GCode according to the paths.
 *
 * @param {object} paths The paths.
 * @return {string} The GCode (empty string if no paths).
 */
function getGCode(config, paths) {
    var gcode = "";
    var i = 0;
    console.log(paths);
    if(paths.length === 0)
        return gcode;

    gcode += "G20 (inches)\n";
    gcode += "G0 Z" + config.safeZ.toFixed(5) + "\n";
    gcode += "M3 (Spindle on clock wise)\n";

    console.log("paths.length= " + paths.length);
    for(i=0; i < paths.length; i++) {
        gcode += getGCodeStraight(config, paths[i]);
    }

    gcode += "M8 (Spindle off)\n";

    gcode += "(Go to the initial position)\n";
    gcode += "G0 Z" + config.safeZ.toFixed(5) + "\n";
    gcode += "G0 X0 Y0\n";
    return gcode;
}

function imgToCarv(config, image)
{
    var table = getTablePercentage(image, config.pixelToInch, config.bitDiameter);
    var paths = [];
    console.log(" image: " + image);
    if(config.type == "pixelized")
        paths = getPixelizedPaths(config, table);

    return getGCode(config, paths);
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

console.log(getTablePercentage(myImage, 1, 0.5));
console.log(getTablePercentage(myImage, 1, 1));
console.log(getTablePercentage(myImage, 1, 2));
console.log(getAverage(imageData, 0, 0, 2, 2));

var table = getTablePercentage(myImage, 1, 2);
console.log(getPixelizedPaths(configuration, table));
console.log(imgToCarv(configuration, myImage));
