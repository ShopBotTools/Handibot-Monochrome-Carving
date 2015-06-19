/*jslint todo: true, browser: true, continue: true */
/**
 * Written by Alex Canales for ShopBotTools, Inc.
 */

//TODO: delete these functions:
//Testing functions
function printPaths(paths) {
    var i = 0;
    var str = "";
    for(i = 0; i < paths.length; i++) {
        str += i + "    ";
        str += "("+paths[i].start.x+";"+paths[i].start.y+";"+paths[i].start.z+")";
        str += " => ";
        str += "("+paths[i].end.x+";"+paths[i].end.y+";"+paths[i].end.z+")";
        str += "\n";
    }
    console.log(str);
}

function printTable(table) {
    var i = 0;
    var str = "";
    for(i = 0; i < table.table.length; i++) {
        str += table.table[i];
        if((i+1) % table.width !== 0) {
            str += " ";
        } else {
            str += "\n";
        }
    }
    console.log(str);
}

//Generate the image on the canvas
function generateImage(canvas, image) {
    var i = 0, index = 0;
    var table = imageToCarving.getTablePercentage(image);
    canvas.width = table.width;
    canvas.height = table.height;
    var ctx = canvas.getContext('2d');
    var imageData = ctx.createImageData(table.width, table.height);

    for(i=0; i < table.table.length; i++) {
        index = i * 4;
        imageData.data[index]   = (1-table.table[i]) * 255;
        imageData.data[index+1] = (1-table.table[i]) * 255;
        imageData.data[index+2] = (1-table.table[i]) * 255;
        imageData.data[index+3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);
}
//End testing functions

//TODO: Explain better what is marginEdge (find a better name too):
//      the variable represents the percentage where two "pixels" should be
//      considered as the continuation of a path or completely different.
//      Example: One pixel has 0.5 and an other 1. If marginEdge is set to
//      more than or equal 0.5, the will be a smooth slope between the two pixels
//      else there will be no slope.
//
//      __                   __
//     |  |__               |  \__
//     |     |              |     |
//      1  0.5               1  0.5
//     marginEdge < 0.5   marginEdge >= 0.5

//TODO: Find a better name for "table":
//      it is supposed to be a map of height variation (in Z) for each
//      incrementation (in x and y). For example, table[1][2] represents
//      the height for the position (2 * cellSize; 1 * cellSize) (matrices
//      doesn't have the same order for coordinates representation

var imageToCarving = {
    pixelToInch : 1,
    bitDiameter : 1,
    maxCarvingDepth : 1,
    marginEdge : 0,
    type : "pixelated",
    safeZ : 3,
    bitLength : 0.5,

    /**
     * Returns the percentage (0 to 1) of black in the pixel.
     *
     * @param {Image data} imageData The image data.
     * @param {number} i The line number.
     * @param {number} j The column number.
     * @return {number} The percentage (0 to 1) of black in the pixel.
     */
    getPercentage: function(imageData, i, j) {
        //1 px = [R, G, B, A]
        var px = (parseInt(i, 10) * imageData.width + parseInt(j, 10)) * 4;

        //NOTE: do we should include the transparency in the process?
        if(px >= imageData.data.length || imageData.data[px+3] !== 255) {
            return 0;
        }
        return 1 - (imageData.data[px] / 255);  //Assuming R = G = B
    },

    /**
     * Returns the average percentage (0 to 1) of black in the area.
     *
     * @param {Image data} imageData The image data.
     * @param {number} iStart The start line number (include).
     * @param {number} jStart The start column number (include).
     * @param {number} iEnd The end line number (include).
     * @param {number} jEnd The end column number (include).
     * @return {number} The percentage (0 to 1) of black in the area.
     */
    getAverage: function(imageData, iStart, jStart, iEnd, jEnd) {
        var sum = 0, count = 0, i = 0, j = 0, temp = 0;

        //swapping
        if(iStart > iEnd) {
            temp = iEnd;
            iEnd = iStart;
            iStart = temp;
        }

        if(jStart > jEnd) {
            temp = jEnd;
            jEnd = jStart;
            jStart = temp;
        }

        for(i=iStart; i < imageData.height && i <= iEnd; i++) {
            for(j=jStart; j < imageData.width && j <= jEnd; j++) {
                sum += this.getPercentage(imageData, i, j);
                count++;
            }
        }

        return sum/count;
    },

    //TODO: change name and test
    /**
     * Generate an array of carving percentage. Each cells have the size of the bit.
     *
     * @param {Image()} image The image.
     * @return {object} An object with three members: width (number), height (number),
     *   table (array of number) which represents the percentage
     */
    getTablePercentage: function(image) {
        var tab = [];  //TABle for the percentage
        var canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        var context = canvas.getContext('2d');
        context.drawImage(image, 0, 0);
        var imageData = context.getImageData(0, 0, image.width, image.height);

        if(image.width * this.pixelToInch < this.bitDiameter ||
                image.height * this.pixelToInch < this.bitDiameter)
        {
            return { width : 0, height : 0,
                cellSize : this.bitDiameter, table : [] };
        }

        var delta = this.bitDiameter / this.pixelToInch;
        var iPx = 0, jPx = 0, tableWidth = 0, tableHeight = 0;

        for(iPx=0; iPx < image.height; iPx+=delta) {
            for(jPx=0; jPx < image.width; jPx+=delta) {
                if(delta - parseInt(delta, 10) > 0) {
                    tab.push(this.getAverage(imageData, iPx, jPx, iPx+delta, jPx+delta));
                } else {
                    tab.push(this.getAverage(imageData, iPx, jPx, iPx+delta-1, jPx+delta-1));
                }
            }
        }
        tableHeight = parseInt(iPx / delta, 10);
        tableWidth = parseInt(jPx / delta, 10);

        return { width : tableWidth, height : tableHeight,
            cellSize : this.bitDiameter, table : tab };
    },

    /**
     * Returns the real X center position of the nth element of the table.
     *
     * @param {object} table The percentage table
     * @param {number} n The index in the table
     * @return {number} The X position
     */
    getRealX: function(table, n) {
        return (n % table.width) * table.cellSize + table.cellSize / 2;
    },

    /**
     * Returns the real Y center position of the nth element of the table.
     *
     * @param {object} table The percentage table
     * @param {number} n The index in the table
     * @return {number} The Y position
     */
    getRealY: function(table, n) {
        //Because screen position is not real, we use table.height
        var c = table.cellSize;
        return (table.height - 1 - parseInt(n / table.width, 10)) * c + c / 2;
    },

    /**
     * Returns the real Z position of the nth element of the table.
     *
     * @param {number} percentage The percentage of carving
     * @return {number} The Z position
     */
    getRealZ: function(percentage) {
        return -(percentage * this.maxCarvingDepth);
    },

    /**
     * Tests if the two percentages are "equal" or not.
     *
     * @param {number} percentage1 A percentage.
     * @param {number} percentage2 A percentage.
     * @return {boolean} Returns if the two percentages are "equal" or not.
     */
    hasToBeSmoothed: function(percentage1, percentage2) {
        return (Math.abs(percentage1 - percentage2) <= this.marginEdge);
    },

    /**
     * Add a path to the paths.
     *
     * @param {object} paths The paths
     * @param {number} startX The x start point.
     * @param {number} startY The y start point.
     * @param {number} startZ The z start point.
     * @param {number} endX The x end point.
     * @param {number} endY The y end point.
     * @param {number} endZ The z end point.
     */
    addPath: function(paths, startX, startY, startZ, endX, endY, endZ) {
        paths.push({
            "start" : { "x" : startX, "y" : startY, "z" : startZ },
            "end" : { "x" : endX, "y" : endY, "z" : endZ }
        });
    },

    /**
     * Add a path to the paths from the index a to the index b.
     *
     * @param {object} table The percentage table
     * @param {object} paths The paths
     * @param {number} a The a index in the percentages table.
     * @param {number} b The a index in the percentages table.
     */
    addPathFromTable: function(table, paths, a, b) {
        this.addPath(paths,
            this.getRealX(table, a),
            this.getRealY(table, a),
            this.getRealZ(table.table[a]),
            this.getRealX(table, b),
            this.getRealY(table, b),
            this.getRealZ(table.table[b])
        );
    },

    getIndexTable: function(table, i, j) {
        return j + i * table.width;
    },

    /**
     * Generate the paths (very pixelated) according to the percentage table.
     * More or less acts like a printer.
     *
     * @param {object} table The percentage table
     * @param {object} path The path.
     */
    getPixelatedPaths: function(table) {
        var paths = [];
        this.getPixelatedPathsLeftToRight(table, paths);
        this.getPixelatedPathsUpToDown(table, paths);
        return paths;
    },

    /**
     * Generate the paths (up to down) according to the percentage table.
     *
     * @param {object} table The percentage table
     * @param {object} path The path.
     */
    getPixelatedPathsUpToDown: function(table, paths) {
        var n = 0, startN = 0, i = 0, j = 0, pN = 0;  //PreviousN

        for(j = 0; j < table.width; j++) {
            for(i = 0; i < table.height; i++) {
                n = this.getIndexTable(table, i, j);

                //Continue the same path
                if(this.getRealX(table, startN) === this.getRealX(table, n) &&
                        table.table[startN] === table.table[n]) {
                    continue;
                }

                //Path discontinued
                if(i === 0) {
                    pN = this.getIndexTable(table, table.width-1, j-1);
                } else {
                    pN = this.getIndexTable(table, i-1, j);
                }

                if(table.table[startN] !== 0) {
                    this.addPathFromTable(table, paths, startN, pN);
                }

                if(this.getRealX(table, startN) === this.getRealX(table, n) &&
                        this.hasToBeSmoothed(table.table[pN], table.table[n]))
                {
                    this.addPathFromTable(table, paths, pN, n);
                }

                startN = n;
            }

        }

        if(table.table[startN] !== 0) {  //Because we can miss the last path
            this.addPathFromTable(table, paths, startN,
                    this.getIndexTable(table, j-1, i-1));
        }
    },

    /**
     * Generate the paths (left to right) according to the percentage table.
     *
     * @param {object} table The percentage table
     * @param {object} path The path.
     */
    getPixelatedPathsLeftToRight: function(table, paths) {
        var n = 0, startN = 0;

        for(n = 0; n < table.table.length; n++) {
            //Continue the same path
            if(this.getRealY(table, startN) === this.getRealY(table, n) &&
                    table.table[startN] === table.table[n]) {
                continue;
            }

            //Path discontinued
            if(table.table[startN] !== 0) {
                this.addPathFromTable(table, paths, startN, n-1);
            }

            if(this.getRealY(table, startN) === this.getRealY(table, n) &&
                this.hasToBeSmoothed(table.table[n-1], table.table[n]))
            {
                this.addPathFromTable(table, paths, n-1, n);
            }

            startN = n;
        }

        if(table.table[startN] !== 0) {  //Because we can miss the last path
            this.addPathFromTable(table, paths, startN, n-1);
        }

    },

    /**
     * Generate GCode for cutting from the start point to the end point.
     *
     * @param {object} path The path.
     * @return {string} The Gcode for this cut
     */
    getGCodeStraight: function(path) {
        var gcode = "";
        var startX = path.start.x.toFixed(5), startY = path.start.y.toFixed(5);
        var endX = path.end.x.toFixed(5), endY = path.end.y.toFixed(5);
        var startZ = "", endZ = "";
        var maxZ = 0;
        var z1Done = false, z2Done = false;

        //Have to do multiple passes because of the height of the bit
        gcode += "(Cutting one pass)\n";
        do {
            maxZ -= this.bitLength;  //The maximum we can go deep in this pass
            if(maxZ <= path.start.z) {
                startZ = path.start.z.toFixed(5);
                z1Done = true;
            } else {
                startZ = maxZ.toFixed(5);
            }

            if(maxZ <= path.end.z) {
                endZ = path.end.z.toFixed(5);
                z2Done = true;
            } else {
                endZ = maxZ.toFixed(5);
            }

            gcode += "G0 Z" + this.safeZ.toFixed(5) + "\n";
            gcode += "G0 X" + startX + " Y" + startY + " (start XY)" + "\n";

            gcode += "G1 Z" + startZ +  " (start Z)" +"\n";
            gcode += "G1 X" + endX + " Y" + endY + " Z" + endZ + "(end)" + "\n";
        } while(z1Done === false || z2Done === false);
        gcode += "G0 Z" + this.safeZ.toFixed(5) + "\n";
        gcode += "(End cutting one pass)\n";

        return gcode;
    },

    /**
     * Creates the GCode according to the paths.
     *
     * @param {object} paths The paths.
     * @return {string} The GCode (empty string if no paths).
     */
    getGCodeFromPaths: function(paths) {
        var gcode = "";
        var i = 0;
        if(paths.length === 0) {
            return gcode;
        }

        //TODO: work on the initialization
        gcode += "G20 (inches)\n";
        gcode += "G17 (XY plane for circular interpolation)\n";
        gcode += "G21 G90 G64 G40\n";

        gcode += "G0 Z" + this.safeZ.toFixed(5) + "\n";
        gcode += "M3 (Spindle on clock wise)\n";

        for(i=0; i < paths.length; i++) {
            gcode += this.getGCodeStraight(paths[i]);
        }

        gcode += "M8 (Spindle off)\n";

        gcode += "(Go to the initial position)\n";
        gcode += "G0 Z" + this.safeZ.toFixed(5) + "\n";
        gcode += "G0 X0 Y0\n";
        gcode += "M05\n";
        gcode += "M02\n";
        return gcode;
    },

    getGCode: function(image) {
        var table = this.getTablePercentage(image);
        var paths = [];
        if(table.width === 0 || table.height === 0) {
            return "";
        }
        if(this.type === "pixelated") {
            paths = this.getPixelatedPaths(table);
        }

        return this.getGCodeFromPaths(paths);
    }
};
