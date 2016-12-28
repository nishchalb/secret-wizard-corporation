// Use this variable to define what a click does
var clickMode = 'default';

var tileArray = [];

var yMax = 8;
var xMax = 6;

var budget = 1000;
var budgetText;

var suspicion = 0;
var endText;
var businessAsUsual = 0;

var startTile;
var endTiles = [];
var gameOver = false;

var straightButton;
var crossButton;
var windfallButton;
var reverseButton;
var restartButton;

var backgroundUI;

var emitter;
var emitter2;
var magicEmitter;

var pipeSound;

var upgradeSFX;

var winsound;
var gameoversound;

/** Core tile class
 *
 * @param {Phaser.Game} game - The phaser game object.
 *
 * @param {string} key - The key to the image for the sprite.
 *
 * @param {number} gridX - The x coordinate (in grid squares) of the tile.
 *
 * @param {number} gridY - The y coordinate (in grid squares) of the tile.
 *
 * @param {Array.<number>} outputs - A list of numbers from 0-3 corresponding to the
 * inputs and outputs to the tile piece. These are numbered from the top edge, increasing clockwise.
 *
 * @constructor
 */
var Tile = function(game, key, gridX, gridY, outputs){
    this.sideLength = 100;
    // Phaser.Sprite.call(this, game, gridX*this.sideLength, gridY*this.sideLength, key);
    this.xPos = gridX*this.sideLength+this.sideLength/2;
    this.yPos = gridY*this.sideLength+this.sideLength/2;

    this.sprite = game.add.button(this.xPos,this.yPos, key, this.onClick, this);
    this.sprite.anchor.setTo(.5,.5);

    this.gridX = gridX;
    this.gridY = gridY;

    this.outputs = outputs;
};

/** Rotate this tile.
 * 
 * @param {boolean} clockwise - true to rotate clockwise, false to rotate counterclockwise.
 */
Tile.prototype.rotate = function(clockwise) {
    var mult = clockwise ? 1 : -1;
    this.sprite.angle += mult * 90;
    for (var i = this.outputs.length - 1; i >= 0; i--) {
        this.outputs[i] = (this.outputs[i] + mult + 4) % 4;
    };
};

/** Function to execute when this Tile is clicked. */
Tile.prototype.onClick = function() {
    if (!gameOver) {
        if (clickMode == 'default') {
        	pipeSound.play();
            this.rotate(true);
            budget -= 100;
            businessAsUsual+=1;
            suspicion-=Math.floor(businessAsUsual*3/4);
            if (suspicion<0) {
                suspicion = 0;
            };
        };
        if (clickMode =='transmuteToCross') {
        	transmuteSound.play();
            businessAsUsual = 0;
         	suspicion += (suspicion+30)*3/4 + Math.random()*30+5;
         	this.sprite.destroy();
          	this.sprite = game.add.button(this.xPos, this.yPos, 'crossPipe', this.onClick, this);
            this.sprite.anchor.setTo(.5, .5);
            if (startTile==this) {
                this.sprite.tint = 0x99ff99;
            };
            for (var i = 0; i < endTiles.length; i++) {
                if (this==endTiles[i]) {
                    this.sprite.tint = 0xff9999;
                };
            };
            this.outputs = [0,1,2,3];
            clickMode = 'default';
        };
        if (clickMode == 'transmuteToStraight') {
        	transmuteSound.play();
            businessAsUsual = 0;
        	suspicion += (suspicion + 10) / 2 + Math.random() * 30 + 5;
            this.sprite.destroy();
            this.sprite = game.add.button(this.xPos, this.yPos, 'straightPipe', this.onClick, this);
            this.sprite.anchor.setTo(.5, .5);
            if (startTile==this) {
                this.sprite.tint = 0x99ff99;
            };
            for (var i = 0; i < endTiles.length; i++) {
                if (this==endTiles[i]) {
                    this.sprite.tint = 0xff9999;
                };
            };
            this.outputs = [1,3];
            clickMode = 'default';
    	};
    	if (clickMode == 'reverse') {
    		pipeSound.play();
            businessAsUsual = 0;
    		suspicion += Math.max(0,(suspicion-20) / 2) + Math.random() * 15 + 5;
    		this.rotate(false);
    		budget -= 100;
    		clickMode = 'default';
    	};
        clickMode = 'default';
        if (suspicion>=100) {
        	gameoversound.play();
            gameOver = true;
            endText = game.add.text(100,150,'FOUND OUT',{fill:'red', font:'bold 100pt Palatino Linotype'});
            return;
        };
        var isFinished = true;
        for (var i = 0; i < endTiles.length; i++) {
            var check = checkSolved(startTile, endTiles[i], []);
            if (!check) {
                isFinished = false;
                break;
            };
        };
        if (isFinished) {
        	winsound.play();
            gameOver = true;
            endText = game.add.text(100,150,'YOU WIN',{fill: 'green', font:'bold 100pt Palatino Linotype'});
        }
        else if (budget<=0) {
        	gameoversound.play();
            gameOver = true;
            endText = game.add.text(100,150,'BANKRUPT',{fill:'red', font:'bold 100pt Palatino Linotype'});
        };
    };
};

/** Core button class
 *
 * @param {Phaser.Game} game - The phaser game object.
 *
 * @param {string} key - The key to the image for the sprite.
 *
 * @param {number} gridX - The x coordinate (in grid squares) of the tile.
 *
 * @param {number} gridY - The y coordinate (in grid squares) of the tile.
 *
 * @param {string} type - The type of button
 *
 * @constructor
 */
var Button = function(game, key, gridX, gridY, type) {
	this.height = 100;
	this.width = 190;
	this.tileLength = 100;
	this.xPos = gridX * this.tileLength + this.width / 2;
	this.yPos = gridY * this.tileLength + this.height / 2;
	this.sprite = game.add.button(this.xPos, this.yPos, key, this.click(type), this);
	this.sprite.anchor.setTo(.5, .5);
    this.game = game;

    if (type!='restart') {
        this.tooltip = this.generateTooltip(type);
        this.sprite.onInputOver.add(this.displayTooltip, this);
        this.sprite.onInputOut.add(this.hideTooltip, this);
    };
};

/** Function to execute when this button is clicked */
Button.prototype.click = function(type) {
    	if (type == 'straightpipe') {
    		var straightPipeFunction = function() {
                if (clickMode == 'default' && !gameOver) {
                	upgradeSFX.play();
    				clickMode = 'transmuteToStraight';
                }
                else if (clickMode == 'transmuteToStraight') {
                	clickMode = 'default';
                };
    		};
    		return straightPipeFunction;
    	};
        if (type=='restart') {
            var restartGame = function() {
                this.game.restart();
            }
            return restartGame;
        };
    	if (type == 'crosspipe') {
    		var crossPipeFunction = function() {
    			if (clickMode == 'default' && !gameOver) {
    				upgradeSFX.play();
    				clickMode = 'transmuteToCross';
    			}
                else if (clickMode == 'transmuteToCross') {
                	clickMode = 'default';
                };
    		};
    		return crossPipeFunction;
    	};
    	if (type == 'windfall') {
    		var windfallFunction = function() {
                if (!gameOver) {
                    upgradeSFX.play();
                    businessAsUsual = 0;
        			budget += 300;
        			suspicion += (suspicion + 10) / 2 + Math.random() * 30 + 5;
        			if (suspicion >= 100) {
        				gameoversound.play();
                    	gameOver = true;
                    	endText = game.add.text(100,150,'FOUND OUT',{fill:'red', font:'bold 100pt Palatino Linotype'});
                    	return;
                    };
                };
    		};
    		return windfallFunction;
    	};
    	if (type == 'reverse') {
    		var reverseFunction = function() {
    			if (clickMode == 'default' && !gameOver) {
    				upgradeSFX.play();
    				clickMode = 'reverse';
    			}
                else if (clickMode == 'reverse' || gameOver) {
                	clickMode = 'default';
                };
    		};
    		return reverseFunction;
    	};
};

/** Generate a tooltip sprite to be displayed on mouseover.
 *
 * @param {string} type A string indicating which type of power is being used.
 * <p /> Valid options include: <ul>
 * <li> 'straightpipe' - The straight pipe transform power. </li>
 * <li> 'crosspipe' - The cross pipe transform power. </li>
 * <li> 'windfall' - The money gain power. </li>
 * <li> 'reverse' - The click direction reversal power. </li>
 * </ul>
 *
 * @return {Phaser.Sprite} A tooltip to display upon mouseover of this Button.
 */
Button.prototype.generateTooltip = function(type) {
    var tooltip = game.add.group();

    var background = game.add.sprite(0,0,'tooltipBG');
    background.anchor.setTo(-0.1, 0.5);
    background.tint = 0xffb6c1;
    background.alpha = 0.8;

    var texttip = game.add.text(0, 0, "", {fill:"Black", font: "12pt Palatino Linotype"});
    texttip.anchor.setTo(-0.3, 0.5);

    tooltip.add(background);
    tooltip.add(texttip);

    tooltip.x = this.sprite.x;
    tooltip.y = this.sprite.y;
    tooltip.visible = false;

    switch (type) {
        case 'straightpipe':
            texttip.text = "Transform the next pipe you click\ninto a straight horizontal pipe.\nSuspicion: Medium";
            break;
        case 'crosspipe':
            texttip.text = "Transform the next pipe you click\ninto a four-way pipe.\nSuspicion: High";
            break;
        case 'windfall':
            texttip.text = "Gain some extra money!\nSuspicion: Medium";
            break;
        case 'reverse':
            texttip.text = "The next click will rotate a pipe\n in the opposite direction.\nSuspicion: Low";
            break;
        default:
            console.log("Default case reached in Button.generateTooltip().")
            break;
    };
    return tooltip;
};

/** Make the tooltip for this Button visible. */
Button.prototype.displayTooltip = function() {
    this.tooltip.visible = true;
};

/** Hide the tooltip for this Button. */
Button.prototype.hideTooltip = function() {
    this.tooltip.visible = false;
};

/**Function to set the color of a button
 * 
 * @param {byte} color - the color to change the button to
 */
Button.prototype.setColor = function(color) {
	this.sprite.tint = color;
};

/** Associative array for which the game runs. 
 * @constructor
 */
var PhaserGame = function(){
};

/** Definition of said associative array. */
PhaserGame.prototype = {

    /** @override */
    preload: function(){
        this.load.image('background', 'assets/background.png');
        this.load.image('water1', 'assets/water1.png');
        this.load.image('water2', 'assets/water2.png');
        this.load.image('water3', 'assets/water3.png');
        this.load.image('water4', 'assets/water4.png');
        this.load.image('brick', 'assets/bricktile.png');
        this.load.image('startscreen', 'assets/startscreen.png');
        this.load.image('wizardhat', 'assets/wizardhat.png');
        this.load.image('straightPipe', 'assets/straightpipe.png');
        this.load.image('triPipe', 'assets/tripipe.png');
        this.load.image('cornerPipe', 'assets/cornerpipe.png');
        this.load.image('crossPipe', 'assets/crosspipe.png');
        this.load.image('suspicionBG', 'assets/suspicionbg.png');
        this.load.image('suspicionBar', 'assets/suspicionbar.png');
        this.load.image('straightPipeButton', 'assets/straightpipebutton.png');
        this.load.image('restartButton', 'assets/restartbutton.png');
        this.load.image('crossPipeButton', 'assets/crosspipebutton.png');
        this.load.image('windfall', 'assets/windfall.png');
        this.load.image('magic1', 'assets/magic1.png');
        this.load.image('magic2', 'assets/magic2.png');
        this.load.image('magic3', 'assets/magic3.png');
        this.load.image('magic4', 'assets/magic4.png');
        this.load.image('magic5', 'assets/magic5.png');
        this.load.image('magic6', 'assets/magic6.png');
        //Replace the spritesheet with the image
        this.load.spritesheet('reverse', 'assets/reverse.png', 200, 100);
		this.load.image('tooltipBG', 'assets/tooltipbg.png');
        this.load.image('powerActive', 'assets/powerActivePointer.png');
        this.load.image('wizard', 'assets/Wizard.png');
        this.load.image('rotationIndicator', 'assets/rotationIndicator.png');
        
        this.load.audio('pipeSound', 'sfx/pipeMove.wav');
		this.load.audio('upgradeSFX', 'sfx/upgrade.mp3');
		this.load.audio('transmuteSound', 'sfx/transmute.wav');
		this.load.audio('winsound', 'sfx/winsound.wav');
		this.load.audio('gameoversound', 'sfx/gameoversound.wav');
        this.load.audio('bgm', 'sfx/bgm.mp3');
    },
    
    /** @override */
    create: function(){
        // Draw background
        this.add.sprite(0,0,'background');
        // Particle emitters for water effect
        emitter = this.add.emitter(200, 0, 100);
        emitter.makeParticles(['water1', 'water2', 'water3', 'water4']);
        emitter.minParticleSpeed.setTo(-300, 30);
        emitter.maxParticleSpeed.setTo(300, 100);
        emitter.minParticleScale = 0.5;
        emitter.maxParticleScale = 2.5;
        emitter.gravity = 250;
        emitter.flow(2000, 700, 8, -1);

        emitter2 = this.add.emitter(600, 0, 100);
        emitter2.makeParticles(['water1', 'water2', 'water3', 'water4']);
        emitter2.minParticleSpeed.setTo(-300, 30);
        emitter2.maxParticleSpeed.setTo(300, 100);
        emitter2.minParticleScale = 0.5;
        emitter2.maxParticleScale = 2.5;
        emitter2.gravity = 250;
        emitter2.flow(2000, 700, 8, -1);

        //Make some sfx
        var bgm = this.add.audio('bgm');
        bgm.volume = 0.35;
        bgm.play();
        pipeSound = this.add.audio('pipeSound');
        transmuteSound = this.add.audio('transmuteSound');
        gameoversound = this.add.audio('gameoversound');
        winsound = this.add.audio('winsound');

        transmuteSound.volume = 0.5;

        //Lay out the pipes
        this.stage.backgroundColor = '#001144';
        backgroundUI = this.add.tileSprite(800, 0, 450, 600, 'brick');
        wizard = this.add.image(1050, 200, 'wizard');
        var layout = createLevelLayout(.4, .1, .45, .05, 48);
        cursors = game.input.keyboard.createCursorKeys();
        for (x = 0; x<8; x++) {
            var columnArray = [];
            for (y = 0; y<6; y++) {
                var tile = new Tile(this.game, layout[6*x+y].key, x, y, layout[6*x+y].outputs);
                var rotations = Math.floor(Math.random()*4);
                for (var i = 0; i < rotations; i++) {
                    tile.rotate(true);
                };
                columnArray.push(tile);
            };
            tileArray.push(columnArray);
        };

        this.drawUI();
        // Particle emitter for magic effect
        magicEmitter = this.add.emitter(600, 0, 100);
        magicEmitter.makeParticles(['magic1', 'magic2', 'magic3', 'magic4',  'magic5', 'magic6']);
        magicEmitter.minParticleSpeed.setTo(-30, -30);
        magicEmitter.maxParticleSpeed.setTo(30, 30);
        magicEmitter.minParticleScale = 0.5;
        magicEmitter.maxParticleScale = 1.5;
        magicEmitter.gravity = 0;
        magicEmitter.flow(2000, 700, 8, -1);
        magicEmitter.on = false;

        this.assignStart(tileArray[Math.floor(Math.random() * yMax)][0]);
        this.assignEnd(tileArray[yMax-1][Math.floor(xMax/2+Math.random() * xMax/2)]);
        this.assignEnd(tileArray[Math.floor(Math.random() * yMax/2)][xMax - 1]);

        /*Place the buttons on the board*/
        reverseButton = new Button(this.game, 'reverse', 8.25, 1.3, 'reverse');
		windfallButton = new Button(this.game, 'windfall', 8.25, 2.3, 'windfall');
        straightButton = new Button(this.game, 'straightPipeButton', 8.25, 3.3, 'straightpipe');
        crossButton = new Button(this.game, 'crossPipeButton', 8.25, 4.3, 'crosspipe');
        restartButton = new Button(this, 'restartButton', 8.2, 5.2, 'restart');
        upgradeSFX = game.add.audio('upgradeSFX');
        upgradeSFX.volume = 0.6;
        // Display Start Screen
        var startScreen = game.add.button(0,0,'startscreen', function(){});
        var startButton = game.add.button(25,50,'wizardhat', function(){
            nameText.kill();
            startText.kill();
            clickText.kill();
            descriptionText.kill();
            creditText.kill();
            startScreen.kill();
            this.kill();
        });
        startButton.height = 500;
        startButton.width = 500;
        startScreen.width = 1250;
        var startText = game.add.text(550, 20, "Secret Wizard Corporation", {fill:"White", font: "20pt Palatino Linotype"});
        var descriptionText = game.add.text(550, 100, "You are the CEO of a small plumbing business.\n"
                                                    + "You are also a magical wizard.\n\n"
                                                    + "Click pipes to rotate them.\n"
                                                    + "Make sure that your company stays afloat by using your magic\n"
                                                    + "to connect the green pipe to the red ones without going bankrupt.\n\n"
                                                    + "On the other hand, don't let anyone find out that you are a wizard!\n"
                                                    + "Keep an eye on how suspicious your clients are.\n\n"
                                                    + "Best of Luck.", 
                                                    {fill:"White", font: "12pt Palatino Linotype"});
        var nameText = game.add.text(10, 10, "Nishchal Bhandari\n"
                                                    + "Isaac Rosado\n"
                                                    + "Pravina Samaratunga\n"
                                                    + "Rachel Thornton", 
                                                    {fill:"White", font: "italic 10pt Palatino Linotype"});
        var clickText = game.add.text(550, 420, "Click the hat to start", 
                                                    {fill:"White", font: "italic 10pt Palatino Linotype"});
        var creditText = game.add.text(960, 375, "Wizard Hat Image courtesy OpenClipart.org.\n"
                                               + "https://openclipart.org/detail/27526/wizards-hat \n\n"
                                               + "Sound effects courtesy of http://www.freesfx.co.uk\n\n"
                                               + "Background Music via Kevin McLeod:\n"
                                               + "Atonal in C-ish Kevin MacLeod (incompetech.com)\n"
                                               + "Licensed under Creative Commons: By Attribution 3.0 License\n"
                                               + "http://creativecommons.org/licenses/by/3.0/\n\n"
                                               + "Win and loss sounds generated at http://www.bfxr.net/",
                                               {fill:"White", fontStyle: "italic", font: "8pt Palatino Linotype"});

    },

    /** @override */
    update: function() {
        this.updateUI();
        if (clickMode == 'default') {
        	reverseButton.setColor(0xffffff);
        	straightButton.setColor(0xffffff);
        	windfallButton.setColor(0xffffff);
        	crossButton.setColor(0xffffff);
        };
        if (clickMode == 'reverse') {
        	reverseButton.setColor(0x800080);
            straightButton.setColor(0xffffff);
            windfallButton.setColor(0xffffff);
            crossButton.setColor(0xffffff);
        };
        if (clickMode == 'transmuteToStraight') {
        	straightButton.setColor(0x800080);
            reverseButton.setColor(0xffffff);
            windfallButton.setColor(0xffffff);
            crossButton.setColor(0xffffff);
        };
        if (clickMode == 'transmuteToCross') {
        	crossButton.setColor(0x800080);
            reverseButton.setColor(0xffffff);
            straightButton.setColor(0xffffff);
            windfallButton.setColor(0xffffff);
        };
    },

    restart: function() {
        gameOver = false;
        suspicion = 0;
        budget = 1000;
        clickMode = 'default';
        if (typeof endText != 'undefined') {
            endText.destroy();
        };
        var layout = createLevelLayout(.4, .1, .45, .05, 48);
        for (x = 0; x<8; x++) {
            for (y = 0; y<6; y++) {
                var tile = tileArray[x][y];
                tile.sprite.destroy();
                tileArray[x][y] = new Tile(this.game, layout[6*x+y].key, x, y, layout[6*x+y].outputs);
                var rotations = Math.floor(Math.random()*4);
                for (var i = 0; i < rotations; i++) {
                    tileArray[x][y].rotate(true);
                };
            };
        };
        endTiles = [];
        this.assignStart(tileArray[Math.floor(Math.random() * yMax)][0]);
        this.assignEnd(tileArray[yMax-1][Math.floor(xMax/2+Math.random() * xMax/2)]);
        this.assignEnd(tileArray[Math.floor(Math.random() * yMax/2)][xMax - 1]);
    },

    /** 
     * Colors the start tile green and assigns it to the variable.
     *
     * @param tile A Tile object that represents the start position.
     */
    assignStart: function(t) {
        startTile = t;
        t.sprite.tint = 0x99ff99;
    },

    /**
     * Colors the end tiles red and assigns it to the variable.
     * 
     * @param tile A Tile object that represents a goal.
     */
    assignEnd: function(t) {
        endTiles.push(t);
        t.sprite.tint = 0xff9999;
    },

    drawUI: function() {
        budgetText = this.add.text(900,0,'$'+budget,{font: 'bold 25pt Palatino Linotype',fill:'white'});
        this.add.text(850,98,"Magic Spells",{font: '18pt Palatino Linotype',fill:'pink'});
        this.add.text(828,38,"Suspicion",{font: 'bold 12pt Palatino Linotype',fill:'pink'});

        suspicionBarBG = this.add.sprite(825, 60, 'suspicionBG');
        suspicionBar = this.add.sprite(suspicionBarBG.x + 5, suspicionBarBG.y + 3, 'suspicionBar');

        //Add an indicator for rotation direction
		rotationIndicator = this.add.sprite(game.input.activePointer.x, game.input.activePointer.y, 'rotationIndicator');
        rotationIndicator.anchor.setTo(.5, .5);
        rotationIndicator.scale.setTo(1.5, 1.5);
        rotationIndicator.alpha = .9;

        powerActivePointer  =this.add.sprite(game.input.activePointer.x, game.input.activePointer.y, 'powerActive');
        powerActivePointer.anchor.setTo(.5,.5);
        powerActivePointer.tint = 0x9900ff;
        powerActivePointer.alpha = 0.6;
    },

    updateUI: function() {
        if (suspicion>100) {
            suspicion=100;
        };
        budgetText.setText('$'+budget);

        //Rotation indicator only active in bounds
        if (clickMode == 'default' && game.input.activePointer.x < 800 &&
        	game.input.activePointer.y > 0 && game.input.activePointer.y < 599
        	&& game.input.activePointer.x > 0) {
        	rotationIndicator.x = game.input.activePointer.x + 15;
        	rotationIndicator.y = game.input.activePointer.y;
        	rotationIndicator.bringToTop();
        	rotationIndicator.visible = true;
        }
        else {
        	rotationIndicator.visible = false;
        };

        if (clickMode != 'default') {
          powerActivePointer.x = game.input.activePointer.x;
          powerActivePointer.y = game.input.activePointer.y;
          powerActivePointer.visible = true;
          powerActivePointer.bringToTop();
          var seed = Math.sin(0.0001 * this.time.totalElapsedSeconds())/2.0 + 0.5;
          var seed2 = Math.sin(this.time.totalElapsedSeconds())/2.0 + 1.5;
          // powerActivePointer.alpha = seed;
          powerActivePointer.scale.x = seed2;
          powerActivePointer.scale.y = seed2;
          var tintPartOne = 0x660000;
          tintPartOne *= -1;
          var tintPartTwo = 0x000099;
          powerActivePointer.tint  = 0x9900ff + seed*(tintPartOne+tintPartTwo);

          magicEmitter.on = true;
          magicEmitter.x = game.input.activePointer.x;
          magicEmitter.y = game.input.activePointer.y;
        }
        else {
          powerActivePointer.visible = false;
          magicEmitter.on = false;
        }
        suspicionBar.scale.x = (suspicion/100)*(190-10);
    }
};

/**
 * Generate a level layout, in the form of a random list where each
 * element specifies a key to a sprite of a tile. The total of the float
 * parameters should be 1
 *
 * @param {float} straight the percentage of tiles that are straight, should be between 0 and 1
 *
 * @param {float} tri the percetage of tiles that are triple, should be between 0 and 1
 *
 * @param {float} corner the percetage of tiles that are corners, should be between 0 and 1
 *
 * @param {float} cross the percetage of tiles that are four way, should be between 0 and 1
 *
 * @param {int} numTiles the number of total tiles in the grid.
 *
 * @return {Array.<Object>} An array of size numTiles that contains objects with two properties:
 * <ul><li>key: A string representing the key of the image of a tile.</li>
 * <li>outputs: An array corresponding to outputs of a tile. More details in the Tile constructor.</li></ul>
 **/
function createLevelLayout(straight, tri, corner, cross, numTiles) {
    var numStraight = numTiles*straight;
    var numCorner = numTiles*corner;
    var numCross = numTiles*cross;
    var numTri = numTiles*tri;

    var layout = [];
    for (i = 0; i<numStraight; i++){
        layout.push({key:'straightPipe', outputs:[1,3]});
    }
    for (i = 0; i<numCorner; i++){
        layout.push({key:'cornerPipe', outputs:[2,3]});
    }
    for (i = 0; i<numCross; i++){
        layout.push({key:'crossPipe', outputs:[0,1,2,3]});
    }
    for (i = 0; i<numTri; i++){
        layout.push({key:'triPipe', outputs:[0,1,3]});
    }
    shuffle(layout);
    return layout;
}

/**
 * Shuffles array in place.
 *
 * @param {Array.<Object>} a The array containing the items to be shuffled.
 *
 */
function shuffle(a) {
    var j, x, i;
    for (i = a.length; i; i -= 1) {
        j = Math.floor(Math.random() * i);
        x = a[i - 1];
        a[i - 1] = a[j];
        a[j] = x;
    }
};

/**
 * Checks if the puzzle has been solved from a given start node to a given end node.
 *
 * @param {Tile} start An array of two elements corresponding to the [x, y] position of the start node.
 *
 * @param {Tile} end An array of two elements corresponding to the [x,y] position of the end node.
 *
 * @param {Array.<Array<number>>} memo An array of previously explored Tiles. If called externally, assumed to be empty.
 *
 * @return {boolean} True if the puzzle is solved, False otherwise.
 */
function checkSolved(start, end, memo) {
    

    //console.log("~1~");
    //console.log(start);
    //console.log(end);
    //console.log(memo);

    if (start == end){
        //console.log("~3~");
        return true;
    };

    for (var i = 0; i < memo.length; i++) {
        if (start == memo[i]){
            //console.log("Memo exit");
            return false;
        };
    };

    memo.push(start);

    for (var i = 0; i < start.outputs.length; i++) {

        var dir = start.outputs[i];

        // dir / dx / dy
        // 0   /  0 / -1
        // 1   / +1 /  0
        // 2   /  0 / +1
        // 3   / -1 /  0

        var newx = start.gridX + (2 - dir) * (dir%2);
        var newy = start.gridY + (dir - 1) * ((dir+1)%2);

        if (newx >= 0 && newy >= 0 && newx < tileArray.length && newy < tileArray[0].length) {
            var newTile = tileArray[newx][newy];
            if (newTile.outputs.indexOf((dir + 2) % 4) >= 0) {
                //console.log(dir);
                var isChildSolved = checkSolved(newTile, end, memo);
                
                if (isChildSolved) {
                    //console.log("~4~");
                    return true;
                };
            };
        };

    };
    //console.log("~2~");
    return false;
}

/** Game object. */
var game = new Phaser.Game(1250, 600, Phaser.AUTO, '', PhaserGame);
