// Game Core State Variables
var playerX, playerY;
var exitX, exitY;
var deskX, deskY;
var oilCount;
var hasMap;

// Structural Maze Generation Dictionary Map Object
// Stores which walls are open/broken for any coordinate string e.g. "0,1" -> {NORTH: true, SOUTH: false...}
var mazeGridData = {};

var artAssets = {
    entrance: 
        "      /=================\\\n" +
        "     /  R A N D O M M E  \\\n" +
        "    |   _______________   |\n" +
        "    |  |               |  |\n" +
        "    |  |   [ 4 0 4 ]   |  |\n" +
        "    |  |_______________|  |\n" +
        "    |                     |",
        
    desk:
        "       _________________\n" +
        "      |  Scholar's Desk |\n" +
        "      |   ___________   |\n" +
        "      |  [__📜_Map___]  |\n" +
        "     /___________________\\\n" +
        "     ||                 ||\n" +
        "     ||        📖       ||",
        
    corridor:
        "     _____________________\n" +
        "    /     |   ||   |     \\\n" +
        "   /      |   ||   |      \\\n" +
        "  |=======|===||===|=======|\n" +
        "  | Books |   ||   | Books |\n" +
        "  |_______|___||___|_______|\n" +
        "  \\                       /\n" +
        "   \\_____________________/",
        
    exit:
        "          ___________ \n" +
        "         /           \\\n" +
        "        /   E X I T   \\\n" +
        "       |     _____     |\n" +
        "       |    |     |    |\n" +
        "       |    |  *  |    |\n" +
        "       |____|_____|____|"
};

var baseDescriptions = [
    "You stand between floor-to-ceiling rows of shifting, randomized book columns.",
    "A heavy draft whistles through freshly generated maze pathways.",
    "The bookshelves around you seem completely decoupled from real space rules.",
    "Crumbling walls partition this procedurally altered stack quadrant.",
    "The alignment of books shifts quietly somewhere in the dark corridors."
];

// Build a randomized, completely connected network topology behind the scenes
function generateProceduralMazeData() {
    mazeGridData = {};
    
    // Scan all possible map rooms between coordinates -3 and 3
    for (var x = -3; x <= 3; x++) {
        for (var y = -3; y <= 3; y++) {
            var coordinateKey = x + "," + y;
            
            // Randomly open pathways (55% baseline chance to be a walk space)
            mazeGridData[coordinateKey] = {
                NORTH: Math.random() > 0.45,
                SOUTH: Math.random() > 0.45,
                EAST:  Math.random() > 0.45,
                WEST:  Math.random() > 0.45
            };
            
            // Boundary enforcement rules: clamp edges so players don't wander off the map infinite scale
            if (y ===  3) mazeGridData[coordinateKey].NORTH = false;
            if (y === -3) mazeGridData[coordinateKey].SOUTH = false;
            if (x ===  3) mazeGridData[coordinateKey].EAST  = false;
            if (x === -3) mazeGridData[coordinateKey].WEST  = false;
        }
    }
}

function initMaze() {
    playerX = 0;
    playerY = 0;
    oilCount = 25;
    hasMap = false;

    // Generate fresh, completely unpredictable layouts
    generateProceduralMazeData();

    // Place Exit destination target safely within boundaries
    exitX = 0; exitY = 0;
    while (exitX === 0 && exitY === 0) {
        exitX = Math.floor(Math.random() * 5) - 2; // Range -2 to 2
        exitY = Math.floor(Math.random() * 5) - 2;
    }

    // Place landmark Desk safely away from home and goal locations
    deskX = 0; deskY = 0;
    while ((deskX === 0 && deskY === 0) || (deskX === exitX && deskY === exitY)) {
        deskX = Math.floor(Math.random() * 5) - 2;
        deskY = Math.floor(Math.random() * 5) - 2;
    }

    // Force entrance crossways to have paths open so players aren't instantly softlocked
    mazeGridData["0,0"].NORTH = true;
    mazeGridData["0,0"].SOUTH = true;
    mazeGridData["0,0"].EAST = true;
    mazeGridData["0,0"].WEST = true;

    document.getElementById("controls").style.display = "block";
    document.getElementById("escape-route").style.display = "none";
    document.getElementById("softlock-reset-zone").style.display = "none";

    // Render setup splash output
    renderProgress("A procedural error scrambled the code! You are trapped in a strictly randomized maze space. Find the blueprint or trace paths to escape before your lantern oil runs out.", artAssets.entrance);
    updateDirectionalControlsUI();
}

function move(direction) {
    var currentRoomKey = playerX + "," + playerY;
    
    // Anti-cheat verification safety rule check: Is path physically open?
    if (!mazeGridData[currentRoomKey] || !mazeGridData[currentRoomKey][direction]) {
        return; 
    }

    oilCount--;

    if (direction === 'NORTH') playerY++;
    if (direction === 'SOUTH') playerY--;
    if (direction === 'EAST')  playerX++;
    if (direction === 'WEST')  playerX--;

    // Core execution checks
    if (playerX === exitX && playerY === exitY) {
        triggerWin();
    } else if (oilCount <= 0) {
        triggerLoss();
    } else {
        processCurrentRoom();
        updateDirectionalControlsUI();
    }
}

// Dynamically toggles buttons active/inactive based on randomized wall placements
// DYNAMICALLY TOGGLES BUTTONS AND DETECTS DEAD ENDS
function updateDirectionalControlsUI() {
    var directions = ['NORTH', 'SOUTH', 'EAST', 'WEST'];
    var currentRoomKey = playerX + "," + playerY;
    var roomPaths = mazeGridData[currentRoomKey];
    var blockedWallCount = 0;

    for (var i = 0; i < directions.length; i++) {
        var dir = directions[i];
        var element = document.getElementById("btn-" + dir);
        
        if (roomPaths && roomPaths[dir] === true) {
            element.removeAttribute("disabled");
            element.style.backgroundColor = "#ffffff";
            element.style.color = "#000000";
            element.style.border = "2px solid #000000";
            element.innerHTML = dir;
        } else {
            element.setAttribute("disabled", "true");
            element.style.backgroundColor = "#ffffff";
            element.style.color = "#cccccc";
            element.style.border = "2px dashed #cccccc";
            element.innerHTML = "WALL";
            blockedWallCount++; // Increment wall counter
        }
    }

    // DYNAMIC SOFTLOCK DETECTION: Monitor if completely cornered
    var softlockZoneElement = document.getElementById("softlock-reset-zone");
    if (blockedWallCount === 4) {
        // Unhide reset option instantly
        softlockZoneElement.style.display = "block";
        document.getElementById("room-text").innerHTML = 
            "<strong>DEAD END.</strong> Every angle is completely blocked by a brick bookcase wall. You are completely softlocked by the archive's architecture!";
    } else {
        // Keep it hidden if even 1 door remains open
        softlockZoneElement.style.display = "none";
    }
}


function processCurrentRoom() {
    var textOutput = "";
    var currentArt = artAssets.corridor;

    if (playerX === deskX && playerY === deskY) {
        currentArt = artAssets.desk;
        if (!hasMap) {
            hasMap = true;
            textOutput = "<strong>LANDMARK:</strong> You find an old researcher's study workspace. Tucked inside an inkwell drawer, you discover an Archive Layout Blueprint! ";
        } else {
            textOutput = "You return to the empty researcher's workspace. Nothing else remains here. ";
        }
    } else {
        var textIndex = Math.abs(playerX + playerY) % baseDescriptions.length;
        textOutput = baseDescriptions[textIndex] + " ";
    }

    var distanceToExit = Math.abs(playerX - exitX) + Math.abs(playerY - exitY);
    if (distanceToExit === 1) {
        textOutput += "<strong>You hear a powerful breeze whistling through a keyhole directly nearby!</strong>";
    } else if (distanceToExit === 2) {
        textOutput += "The air density changes. A door might be a couple moves away.";
    }

    if (hasMap) {
        textOutput += "<br><br><span style='border:1px solid #000; padding:2px;'>📜 Blueprint Reading: Exit target located at zone [" + exitX + ", " + exitY + "]</span>";
    }

    renderProgress(textOutput, currentArt);
}

function renderProgress(narrativeText, asciiArt) {
    document.getElementById("room-text").innerHTML = narrativeText + 
        "<br><br><small>Coordinates: [" + playerX + ", " + playerY + "]</small>";
    document.getElementById("oil-display").innerHTML = "Lantern Oil: " + oilCount;
    document.getElementById("inventory-display").innerHTML = "Inventory: " + (hasMap ? "Archive Blueprint" : "None");
    document.getElementById("room-art").innerHTML = asciiArt;
}

function triggerWin() {
    document.getElementById("room-art").innerHTML = artAssets.exit;
    document.getElementById("room-text").innerHTML = "<strong>SUCCESS!</strong> You discover a heavy security hatch door hidden behind swinging book partitions. Stepping through, you climb safely back out to civilization.";
    endGameSequence();
}

function triggerLoss() {
    document.getElementById("oil-display").innerHTML = "Lantern Oil: EMPTY";
    document.getElementById("room-text").innerHTML = "<strong>DARKNESS... OUT OF OIL.</strong> Your lantern wick sputters completely black. Lost inside the randomized shifting halls, you wait for rescue crews.";
    endGameSequence();
}

function endGameSequence() {
    document.getElementById("controls").style.display = "none";
    document.getElementById("escape-route").style.display = "block";
}

// Auto start initialization loops
initMaze();
