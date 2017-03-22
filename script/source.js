/////////////////////MOD_ENGINE/////////////////////

var config = {//config of ModEngine
	dev: false,
	show_errors: true
}

var Logs = [];
var Client = {	};

Client.log = function(log, string){
	if(!log)
		Logs.push(string)
	else Logs.push([log, string])
}

Client.runGUI = function(f){
	context.runOnUiThread(new java.lang.Runnable({
		run: function(){
			try{
				f();
			}catch(e){
				this.print(e);
			}
		}
	}));
}

Client.alert = function(title,text){
	converted_logs = "";
	Logs = [];
	this.runGUI(function(){
		var dialog = new android.app.AlertDialog.Builder(context);
		title&&dialog.setTitle(title+"");
		var scroll = new android.widget.ScrollView(context);
		var layout = new android.widget.LinearLayout(context)
		text&&(text+="",text=text.split("\n").join("<br>"), dialog.setMessage(android.text.Html.fromHtml(text)));
		scroll.addView(layout);
		dialog.setView(scroll); 
		dialog.create().show(); 
		return dialog;
	});
}


var context = com.mojang.minecraftpe.MainActivity.currentMainActivity.get();
var ModEngine = {
	onLoad_getAllInformationAboutItems: function(){
		FileAPI.createFile(FileAPI.getFullPath("games/com.mojang/mod_engine/res"), "ids.meinfo");
	}
};

ModEngine.compatibilityVersions = ["0.14.0", "0.14.1"];
Client.version = ModPE.getMinecraftVersion();

function isCompatibilityVersion(version){
	this.is = false;
	for(var i in ModEngine.compatibilityVersions){
		if(version != ModEngine.compatibilityVersions[i]) this.is = false;
		if(version == ModEngine.compatibilityVersions[i]){ this.is = true; return this.is; }
	}
	
	return this.is;
}

if(isCompatibilityVersion(Client.version) == true){/* done */}
if(isCompatibilityVersion(Client.version) == false) Client.alert("WARNING","This version of Minecraft: " + Client.version + " is not compatibility.\nPlease install compatibility version.\n\n<font color=red>Compatibility versions: " + ModEngine.compatibilityVersions);


ModEngine.onLoad = function(){
    FileAPI.createDir(FileAPI.getFullPath("games/com.mojang"),"mod_engine");
	FileAPI.createDir(FileAPI.getFullPath("games/com.mojang/mod_engine"),"res");
	FileAPI.createDir(FileAPI.getFullPath("games/com.mojang/mod_engine/res"),"music");
	FileAPI.createDir(FileAPI.getFullPath("games/com.mojang/mod_engine/res"),"sound");
	FileAPI.createDir(FileAPI.getFullPath("games/com.mojang/mod_engine"),"cache");
	FileAPI.createDir(FileAPI.getFullPath("games/com.mojang/mod_engine"),"mods");
	FileAPI.extractFile("font.ttf","games/com.mojang/mod_engine/res/font.ttf");
	ModEngine.addHook("onModEngineLoad")
}

var World = { };

try {

var ModAPI = {
	spawnExpOrb: function(x,y,z,exp){
		if(exp){
			Entity.setExtraData(Level.spawnMob(x, y, z, 69), "exp.count", exp);
		}
	},
	setBlockType: function(id, type){
		blocks[id].type = type;
	},
	setBlockLevel: function(id, level){
		blocks[id].level = level;
	},
	setCustomToolType: function(name, toolType){
		ToolType[name] = toolType;
		if(!toolType.useItem) toolType.useItem = function(){return};
		if(!toolType.destroyBlock) toolType.destroyBlock = function(){return};
		if(!toolType.startDestroyBlock) toolType.startDestroyBlock = function(){return};
	},
	setCustomToolMaterial: function(name, toolMaterial){
		ToolMaterial[name] = toolMaterial;
	},
	setTool: function(ID, textureName, textureData, name, toolType, toolMaterial){
		ModAPI.defineItem(ID, textureName, textureData, name, 1, false);
		Item.setHandEquipped(ID, true);
		Item.setMaxDamage(ID, toolMaterial.maxDmg);
		if(toolType.enchantType){
			Item.setEnchantType(ID, toolType.enchantType, toolMaterial.enchant);
		}
		tools[ID] = [toolType, toolMaterial.level, toolMaterial.miningSpeed]
		if(toolType.damage){
			weapon[ID] = [toolType.damage + toolMaterial.damage, toolMaterial.fire, toolType.destroyTool]
		}
	},
	getMiningLevel: function(block){
		tool = tools[itemID]
		if(tool && itemData < Item.getMaxDamage(itemID) && tool[0].blockTypes.indexOf(block.type)!==-1){
			return tool[1]
		}
		tool = minecraftTools[itemID]
		if(tool && tool[0]==block.type){
			return tool[1]
		}
		return -1
	},

	destroyItem: function(damage, destroyTool){
		itemID = Player.getCarriedItem();
		itemData = Player.getCarriedItemData();
		if(itemData+damage >= Item.getMaxDamage(itemID) && destroyTool){
			Level.playSoundEnt(player, "random.break", 1,1);
			Entity.setCarriedItem(player, 0);
		}
		else{
			if(itemData+damage <= Item.getMaxDamage(itemID)){
				var slot = Player.getSelectedSlotId();
				var name = Player.getItemCustomName(slot);
				var enc = Player.getEnchantments(slot);
				var unbreacking = 0
				for(var n in enc){
					if(enc[n].type==Enchantment.UNBREAKING) unbreacking = enc[n].level
				}
				if(Math.random()*100 < 100/(unbreacking+1)){
					Entity.setCarriedItem(player,itemID,1,itemData+damage)
					if(name) Player.setItemCustomName(slot, name);
					for(var n in enc){
						Player.enchant(slot, enc[n].type, enc[n].level);
					}
				}
			}
		}
	},
};

var ToolMaterial = {
	WOOD: {maxDmg:30, level:1, miningSpeed:2, enchant:15, damage:0},
	STONE: {maxDmg:66, level:2, miningSpeed:4, enchant:5, damage:1},
	IRON: {maxDmg:251, level:3, miningSpeed:6, enchant:14, damage:2},
	GOLD: {maxDmg:33, level:1, miningSpeed:12, enchant:15, damage:0},
	DIAMOND: {maxDmg:1562, level:4, miningSpeed:8, enchant:10, damage:3}
};

var ToolType = {
	sword: {
		useItem:function(){return},
		damage: 4,
		destroyTool: true,
		enchantType: EnchantType.weapon,
		blockTypes: [],
		craftRecipe: ["a", "a", "b"],
		startDestroyBlock: function(x,y,z, side, blockID, blockType, blockLvl, destroyTime){
		if(blockID==30){
			Block.setDestroyTime(30, 0.08);}
			if(swordBlocks.indexOf(blockID)!==-1){
			Block.setDestroyTime(blockID, destroyTime/1.5);}
		},
		destroyBlock: function(x, y, z, side, blockID){
			ModAPI.destroyItem(2);
			if(blockID==30) drop(x,y,z,287,1);
		}
	},
 
	shovel: {
		damage: 2,
		destroyTool: true,
		blockTypes: ["dirt"],
		enchantType: EnchantType.shovel,
		craftRecipe: ["a", "b", "b"],
		useItem: function(x, y, z, blockID, itemID, side, itemDmg, blockDmg){
			if(blockID==2&&side==1){ 
				setTile(x, y, z, 198);
				Level.playSoundEnt(player, "step.grass", 0.5, 0.75);
				ModAPI.destroyItem(1, true);
			}
		}
	},
	 
	pickaxe: {
		useItem:function(){return},
		damage: 2,
		destroyTool: true,
		blockTypes: ["stone"],
		enchantType: EnchantType.pickaxe,
		craftRecipe: ["aaa", " b ", " b "]
	},
	 
	axe: {
		useItem:function(){return},
		damage: 3,
		destroyTool: true,
		blockTypes: ["wood"],
		enchantType: EnchantType.axe,
		craftRecipe: ["aa", "ab", " b"]
	},
	 
	hoe: {
		blockTypes: [],
		craftRecipe: ["aa", " b", " b"],
		useItem: function(x, y, z, blockID, itemID, side, itemDmg, blockDmg){
			if((blockID==2||blockID==3)&&side==1){ 
				setTile(x, y, z, 60);
				Level.playSoundEnt(player, "step.gravel", 0.5, 0.75);
				ModAPI.destroyItem(1, true);
			}
		}
	}
};

var FileAPI = {	};
var Data = {
	path_cache: android.os.Environment.getExternalStorageDirectory() + "/games/com.mojang/mod_engine/cache",
	path_saves: "",
	File: java.io.File,
	FileReader: java.io.FileReader,
	BufferedReader: java.io.BufferedReader,
	FOS: java.io.FileOutputStream,
	String: java.lang.String,
	StringBuilder: java.lang.StringBuilder,
	exists: function(dir, file){
		return this.File(dir, file).exists();
	},
	create: function(dir, name){
		this.File(dir, name).createNewFile();
	},
	delete_: function(dir, name){
    	this.File(dir, name).delete();
    },
    write: function(dir, name, text){
		var writer = new this.FOS(this.File(dir, name));
		writer.write(new this.String(text).getBytes());
	},
    read_: function(dir, name){
		var reader = (new this.BufferedReader(new this.FileReader(this.File(dir, name))));
    	var data = new this.StringBuilder();
   	 var string;
  	  while ((string = reader.readLine()) != null){
        	data.append(string);
    	    data.append('\n');
        }
        return data.toString();
	},
	
	
	save_cache:function(name, variable){
		this.File(this.path_cache).mkdirs();
        this.create(this.path_cache, name);
        this.text_ = JSON.stringify(variable, "", 4);
        this.write(this.path_cache, name, this.text_);
	},
    read_cache:function(name, variable){
  	  if(this.exists(this.path_cache, name)){
       	 eval(variable+"="+this.read_(this.path_cache, name))
  	  };
	},
   delete_cache:function(name){
   	if(this.exists(this.path_cache, name)){
       	this.delete_(this.path_cache, name);
       };
	},
 
	save:function(name, variable){
    	this.File(this.path_saves).mkdirs();
		this.create(this.path_saves, name);
		this.text_ = JSON.stringify(variable, "", 4);
        this.write(this.path_saves, name, this.text_);
	},
	read:function(name, variable){
		if(this.exists(this.path_saves, name)){
        	eval(variable+"="+this.read_(this.path_saves, name))
	    };
	},
	delete:function(name){
		if(this.exists(this.path_saves, name)){
			this.delete_(this.path_save, name);
		};
	}
};

} catch(e) { 
Client.log("WARNING", "" + e.message +" line: " + e.lineNumber)
}



ModEngine.mods = { };
ModEngine.hooks = { };

var player;
var weapon_tick = 0
var tool;
var itemID;
var itemData;
var blockID;
var blockData;
var tools = {};
var weapon = {};

var minecraftTools = {
	256:["dirt", 3, 6], 269:["dirt", 1, 2], 273:["dirt", 2, 4], 277:["dirt", 4, 8], 284:["dirt", 1, 12],
	257:["stone", 3, 6], 270:["stone", 1, 2], 274:["stone", 2, 4], 278:["stone", 4, 8], 285:["stone", 1, 12],
	258:["wood", 3, 6], 271:["wood", 1, 2], 275:["wood", 2, 4], 279:["wood", 4, 8], 286:["wood", 1, 12],
	359:["leaves", 0]
}

var swordBlocks = [18, 86, 91, 103, 106, 127, 161];

var minecraftBlocks = {
	"dirt": {
		0:[2, 3, 12, 13, 60, 78, 80, 82, 88, 110, 198, 243]
	},
	"stone": {
		1:[1, 4, 16, 23, 24, 27, 28, 43, 44, 45, 48, 61, 62, 66, 67, 70, 71, 79, 87, 98, 108, 109, 112, 113, 114, 116, 117, 118, 121, 125, 126, 128, 139, 145, 147, 148, 152, 153, 154, 155, 156, 159, 167, 172, 173, 174, 179, 180, 181, 182, 245], //29, 33
		2:[15, 21, 22, 42, 52, 101],
		3:[14, 41, 56, 57, 73, 74, 129, 133],
		4:[49]
	},
	"wood": {
		0:[5, 17, 25, 47, 53, 54, 58, 63, 64, 85, 86, 91, 96, 107, 134, 135, 136, 158, 162, 163, 164, 183, 184, 185, 187]
	},
	"leaves": {
		0:[18, 161]
	},
	"glass": {
		0: [20, 102]
	}
}

var blocksDrop = {
	1: function(x,y,z, blockData, enchant){
		if(blockData == 0){
			if(enchant.type == "silk_touch"){
				drop(x, y, z, 1, 1);
			}
			else {
				drop(x, y, z,4,1);
			}
		}
		else {
			drop(x, y, z, 1, 1, blockData);
		}
	},
	16: function(x,y,z, blockData, enchant){
		if(enchant.type=="silk_touch"){
			drop(x,y,z, 16, 1);
		}
		else {
			drop(x,y,z, 263, random(1, 1+enchant.level));
			ModAPI.spawnExpOrb(x+0.5, y+0.5, z+0.5, random(0,2));
		}
 },
	21: function(x,y,z, blockData, enchant){
		if(enchant.type=="silk_touch"){
			drop(x,y,z, 56, 1);
		}
		else {
				drop(x,y,z, 351, random(4, 8*enchant.level), 4);
				ModAPI.spawnExpOrb(x+0.5, y+0.5, z+0.5, random(2,5));
		}
	},
	43: function(x,y,z, blockData){
		drop(x,y,z, 44, 2, blockData);
	},
	52: function(x,y,z){
		ModAPI.spawnExpOrb(random(15,43));
	},
	56: function(x,y,z, blockData, enchant){
		if(enchant.type=="silk_touch"){
			drop(x,y,z, 56, 1);
		}
		else {
			drop(x,y,z, 264, random(1, 1+enchant.level));
			ModAPI.spawnExpOrb(x+0.5, y+0.5, z+0.5, random(3,7));
		}
	},
	62: function(x,y,z){
		drop(x,y,z, 61, 1);
	},
	73: function(x,y,z, blockData, enchant){
		if(enchant.type=="silk_touch"){
			drop(x,y,z, 73, 1);
		}
		else {
			drop(x,y,z, 331, random(4, 5+enchant.level));
			ModAPI.spawnExpOrb(x+0.5, y+0.5, z+0.5, random(1,5));
		}
	},
	74: function(x,y,z, blockData, enchant){
		if(enchant.type=="silk_touch"){
			drop(x,y,z, 73, 1);
		}
		else {
				drop(x,y,z, 331, random(4, 5+enchant.level));
				ModAPI.spawnExpOrb(x+0.5, y+0.5, z+0.5, random(1,5));
		}
	},
	78: function(x,y,z, blockData){
		drop(x,y,z, 332, Math.floor(blockData/4)+1);
	},
	80: function(x,y,z){
		drop(x,y,z, 332, 4);
	},
	129: function(x,y,z, blockData, enchant){
		if(enchant.type=="silk_touch"){
			drop(x,y,z, 129, 1);
		}
		else {
			drop(x,y,z, 388, random(1, 1+enchant.level));
			ModAPI.spawnExpOrb(x+0.5, y+0.5, z+0.5, random(3,7));
		}
	},
	153: function(x,y,z, blockData, enchant){
		if(enchant.type=="silk_touch"){
			drop(x,y,z, 153, 1);
		}
		else {
			drop(x,y,z, 406, random(1, 1+enchant.level));
			ModAPI.spawnExpOrb(x+0.5, y+0.5, z+0.5, random(2,5));
		}
	}
}

Block.setDestroyTime(1,2);
Block.setDestroyTime(4,1.5);
Block.setDestroyTime(139,2);
Block.setDestroyTime(181,0.8);
Block.setDestroyTime(182,0.8);

var blocks = {};

for(var id = 1; id < 256; id++){
	blocks[id] = {level:0}
}

for(var type in minecraftBlocks){
	for(var lvl in minecraftBlocks[type]){
		for(var n in minecraftBlocks[type][lvl]){
			id = minecraftBlocks[type][lvl][n]
			blocks[id].type = type
			blocks[id].level = lvl
		}
	}
}

ModEngine.mods.modEngine = {
	name: "ModEngine",
	author: "FireGhost2909 LockMoon Project",
	version: "1.0",
	description: "ModEngine adding API and Loader for other mods"
}

ModEngine.mods.modAPI = {
	name: "ModAPI",
	author: "FireGhost2909 LockMoon Project™, MineExplorer",
	version: "1",
	description: "Adding API"
}


Client.restart = function(){
	net.zhuoweizhang.mcpelauncher.ui.NerdyStuffActivity.forceRestart(context);
}

Client.sleep = function(time){
     java.lang.Thread.sleep(time);
}

Client.message = function(string){
	clientMessage(string);
	return;
}

Client.message_mod = function(path){
var mod_path = ModEngine.mods[path];
  this.message("§a<<" + mod_path["name"] + ">> §1version: §4[" + mod_path["version"] + "]\n§bAuthor: §9" + mod_path["author"] + "\n" + "§c" + mod_path["description"])
	return;
}

Client.tipMessage = function(string){
	ModPE.showTipMessage(string);
	return;
}

Client.print = function(string){
	print(string);
	return;
}


var Color = {
	blue: "§9",
	darkBlue: "§1",
	red: "§c",
	darkRed: "§4",
	green: "§a",
	darkGreen: "§2",
	yellow: "§e",
	orange: "§6",
	white: "§f",
	black: "§0",
	gray: "§7",
	darkGray: "§8",
	aqua: "§b",
	darkAqua: "§3",
	purple: "§d",
	darkPurple: "§5"
}

ModEngine.version = "0.065 §ebeta§4";

ModAPI.startMessage = function(){
	return Color.aqua + "ModEngine " + Color.darkRed + "[v " + ModEngine.version + "]\nAuthor - " + ModEngine.mods.modEngine.author;
}


var lang = {
	call: {},
	edits: function(){
		ModEngine.addHook("nameEdit")
	}
}

lang.get = function(language){
try {
	var textFromTexturePack=function(file){
		return ModPE.getBytesFromTexturePack("lang/" + file + ".melang");
	}
	var convertedText=function(text){
		return new java.lang.String(textFromTexturePack(text));
	};
	if(textFromTexturePack(language) != null && language != "en_US"){
		eval("lang.call = " + convertedText(language));
	}
	if(textFromTexturePack(language) == null && language != "en_US"){
		eval("lang.call = " + convertedText("en_US"));
	}
	if(textFromTexturePack(language) != null && language == "en_US"){
		eval("lang.call = " + convertedText("en_US"));
	}
} catch (e) {
	Client.log("WARNING", "Localization files were not found.\nMore information: \n" + e.message + " line: " + e.lineNumber)
}
};

function random(min, max){
	return Math.floor(Math.random() * (max - min + 1)) + min;
}


ModEngine.writeFileFromByteArray = function(byteArray,path){
try{
	var file = new java.io.File(path);
	file.getParentFile().mkdirs();
	var stream = new java.io.FileOutputStream(file);
	stream.write(byteArray);
	stream.close();
}catch(e){ 
	Client.log("ERROR", "Can't write file from byteArray, more information:\n" + e.message + " line: " + e.lineNumber)
}
};

ModPE.getGUIScale = function(){
	var options_file = new java.io.File("/sdcard/games/com.mojang/minecraftpe/options.txt");
	var BufferedReader = new java.io.BufferedReader(new java.io.InputStreamReader(new java.io.FileInputStream(options_file)));
	var read, guiscale;
	while((read = BufferedReader.readLine()) != null){
		if(read.split(":")[0] == "gfx_guiscale") {
			guiscale = read.split(":")[1];
			break;
		}
	}
	BufferedReader.close();
	return guiscale;
};

ModEngine.callHook = function(name, args){ 
	var all = this.hooks[name]; 
		if(!all) all = [ ]; 
	all.push({
		arguments: args,
		mod: ModEngine.mod
	}); 
	this.hooks[name] = all; 
}
 
ModEngine.addHook = function(name, a, b, c, d, e, f, g, h){ 
	var all = this.hooks[name]; 
		if(!all) return; 
		for(var i in all){ 
		all[i].arguments(a, b, c, d, e, f, g, h); 
    } 
}



ModPE.getCarriedItem = function(id, data, count){
	this.id = Player.getCarriedItem();
	this.data = Player.getCarriedItemData();
	this.count = Player.getCarriedItemCount();
   
	if(this.id == id && this.data == data && this.count == count){
		return true;
	}
	else return false;
}

ModPE.getItemInInv = function(id, data, count){
	if(!count) count = 1;
	if(!data) data = 0;
	if(!id) id = 0;
	this.currentCount = 0;

	for(var i = 0; i < 35; i++){
		if(Player.getInventorySlot(i) == id && Player.getInventorySlotData(i) == data){
			currentCount += Player.getInventorySlotCount(i);
		}
		if(currentCount >= count){
			return true;
		}
	}
}

World.getTile = function(x, y, z, id, data){
	if(!id || !data) return false;
	if(id && !data) data = 0;

	if(getTile(x, y, z) == id && Level.getData(x, y, z) == data) 
		return true;
}

World.setTile = function(x,y,z,id,data){
	setTile(x,y,z,id,data);
	return;
}


//////////////GENERATION///////////////

/*

var thread = 0;
var inWorld = false;
var threadFunctions = [];
var chunkSize = 32;
var chunkGirth = 8;
var toSetTile = [];
var generations = [];
var playerChunk = {};

function ____run_(func) {
	threadFunctions.push(func);
	if(!thread){
		thread = new java.lang.Thread({run: function() {
		while(true){
			if(inWorld) {
				var f = threadFunctions.shift();
				if(f){
					thread.yield();
					try {
						f();
					} catch(e){
						Client.log("ERROR", e.message + e.lineNumber);
					}
				} else thread.sleep(25);
			} else {
				thread.yield();
				thread.sleep(25);
			}
		}
	}
});
thread.setPriority(1);
thread.start();
}
}

function getDistance(x1, y1, z1, x2, y2, z2){ 
	return Math.round(Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2) + Math.pow(z2 - z1, 2))); 
}

function splash(value){ 
	return random(value / 2, value + value / 2); 
}

function ____chunkIsLoad_(x, z){
	return Level.getTile(x, 0, z) > 0; 
}

function prob(chance){ 
	return random(0, 100) < chance; 
}

function ____tryGenerateChunk_(chunkX, chunkZ) {
	if(!____chunkIsLoad_(chunkX, chunkZ) || Level.getTile(chunkX, 0, chunkZ) == 49) return;
	for (var i = 0; i < generations.length; i++) {
		Level.setTile(chunkX, 0, chunkZ, 49);
		Level.setTile(chunkX, 1, chunkZ, 7);
		generations[i](chunkX, chunkZ);
	}
}

function ____generationUpdate_() { 
	var pCX = Math.floor(getPlayerX() / chunkSize) * chunkSize;
	var pCZ = Math.floor(getPlayerZ() / chunkSize) * chunkSize;
	____tryGenerateChunk_(pCX, pCZ);
	for (var d = 1; d < chunkGirth; d++){
		for (var l = -d; l < d + 1; l++){
			if (pCX != playerChunk.x || pCZ != playerChunk.z) return;
			var dp = d * chunkSize;
			var lp = l * chunkSize;
			____tryGenerateChunk_(pCX - dp, pCZ + lp);
			____tryGenerateChunk_(pCX + dp, pCZ - lp);
			____tryGenerateChunk_(pCX - lp, pCZ + dp);
			____tryGenerateChunk_(pCX + lp, pCZ - dp);
		}
	}
}

function ____generationTick_() {
	____run_(____generationUpdate_);
	playerChunk = {x: Math.floor(getPlayerX() / chunkSize) * chunkSize, z: Math.floor(getPlayerZ() / chunkSize) * chunkSize};
	toSetTile.forEach(function(tile, index) {
		Level.setTile(tile.x, tile.y, tile.z, tile.id, tile.data);
		toSetTile.splice(index, 1);
	});
}

World.generation = {};
World.generation.setTile = function(x,y,z,id,data,inThread){
	if(!inThread) inThread = true;
	if (inThread) {
		thread.sleep(1);
		toSetTile.push({x: x, y: y, z: z, id: id, data: data});
	} else Level.setTile(x, y, z, id, data);
};

World.generation.surface = {};
World.generation.ore = {};
World.generation.ore.type = {};

function generationOnSurface(chunkX, chunkZ, quantity, reraty, targets, generation) {
for (var c = 0; c < splash(quantity); c++) {
if (!prob(reraty)) continue;
var x = chunkX + random(0, chunkSize); 
var z = chunkZ + random(0, chunkSize);
for (var y = 128; y > 0; y--) {
var tileId = Level.getTile(x, y, z);
var tileData = Level.getData(x, y, z);
if (tileId != 0) {
for (var i = 0; i < targets.length; i++) {
if (tileId == targets[i].id && tileData == targets[i].data) {
generation(x, y, z, tileId, tileData);
break;}}
break;}}}}

function addGeneration(type) { generations.push(type); }

function generationUnderSurface(chunkX, chunkZ, quantity, reraty, minY, maxY, generation) {
for (var c = 0; c < splash(quantity); c++) {
if (!prob(reraty)) continue;
var x = chunkX + random(0, chunkSize); 
var y = random(minY, maxY);
var z = chunkZ + random(0, chunkSize);
generation(x, y, z);}}

function setOre(x, y, z, id, size, data) {
size /= 2;
for (var xs = -splash(size); xs <= splash(size); xs++) {
for (var zs = -splash(size); zs <= splash(size); zs++) {
for (var ys = -splash(size); ys <= splash(size); ys++) {
if (getDistance(x, y, z, x + xs, y + ys, z + zs) < random(0, size) && Level.getTile(x + xs, y + ys, z + zs) == 0) setTile(x + xs, y + ys, z + zs, id, data);}}}}

function genMarble(x, z){
x += random(0, chunkSize);
var y = random(10, 60);
z += random(0, chunkSize);
var randX = 0.5 + Math.random() / 2;
var randY = 1.75 + Math.random() * 2;
var randZ = 0.5 + Math.random() / 2;
var randR = Math.random() * 3;
rX = (6 + Math.ceil(randR)) / Math.sqrt(randX);
rY = (6 + Math.ceil(randR)) / Math.sqrt(randY);
rZ = (6 + Math.ceil(randR)) / Math.sqrt(randZ);
for (var xx = -rX; xx <= rX; xx++) {
for (var yy = -rY; yy <= rY; yy++) {
for (var zz = -rZ; zz <= rZ; zz++) {
if (Math.sqrt(xx * xx * randX + yy * yy * randY + zz * zz * randZ) < 6 + randR + Math.random()) {
setTile(x + xx, y + yy, z + zz, 1);}}}}}

addGeneration(function(chunkX, chunkZ) {
generationOnSurface(chunkX, chunkZ, 1, 100, [{id: 2, data: 0}, {id: 12, data: 0}], function(x, y, z, id, data) {
for (h = 1; h < 6; h++) setTile(x, y + h, z, 139);
setTile(x, y + h, z, 152);
if (prob(50)) {
setTile(x + 1, y + h, z, 123);
setTile(x - 1, y + h, z, 123);
} else {
setTile(x, y + h, z + 1, 123);
setTile(x, y + h, z - 1, 123);}});});

addGeneration(function(chunkX, chunkZ) { generationUnderSurface(chunkX, chunkZ, 10, 10, 10, 60, function(x, y, z) { genMarble(x, z) }); });

addGeneration(function(chunkX, chunkZ) { generationUnderSurface(chunkX, chunkZ, 10, 100, 10, 60, function(x, y, z) { setOre(x, y, z, 41, 4); }); });

addGeneration(function(chunkX, chunkZ) { generationUnderSurface(chunkX, chunkZ, 10, 100, 10, 60, function(x, y, z) { setOre(x, y, z, 133, 4); }); });

addGeneration(function(chunkX, chunkZ) { generationUnderSurface(chunkX, chunkZ, 10, 100, 10, 60, function(x, y, z) { setOre(x, y, z, 89, 4); }); });

ModEngine.callHook("onPlayerJoin", function(){
	inWorld = true;
});

ModEngine.callHook("everyTick", function(){
	if(inWorld == true)
		____generationTick_();
});

ModEngine.callHook("afterPlayerLeave", function(){
	inWorld = false;
	if(thread){ thread.stop(); thread = 0 }
});

World.generation.ore.type.Tfc = function(id, data, id2, maxY, x, z){
	ore.thread(function(){
		x = Math.floor(Math.random() * 16) + x;
		z = Math.floor(Math.random() * 16) + z;
		var y = random(2, maxY);
			for(var xa = -3; xa < 3; xa++){
				for(var ya = -3; ya < 3; ya++){
					for(var za = -3; za < 3; za++){
						var d = Math.sqrt(xa * xa + ya * ya + za * za);
						var r = 1.5 - Math.random() / 2;
						if(d < r) ore.set(x + xa, y + ya, z + za, id, data, id2);
					}
				}
			}
	})
}

World.generation.ore.type.Normal = function(id, data, id2, maxY, x, z){
	x = Math.floor(Math.random() * 16) + x;
	z = Math.floor(Math.random() * 16) + z;
	var y = random(2, maxY);
	for(var  xa = -1; xa < 2; xa++){
		for(var ya = -1; ya < 2; ya++){
			for(var za = -1; za < 2; za++){
				var d = Math.sqrt(xa * xa + ya * ya + za * za);
				var r = 1.5 - Math.random() / 1.5;
				if(d < r) ore.set(x + xa, y + ya, z + za, id, data, id2);
			}
		}
	}
}
 
World.generation.ore.type.Small = function(id, data, id2, maxY, x, z){
	x = Math.floor(Math.random() * 16) + x;
	z = Math.floor(Math.random() * 16) + z;
	var y = random(2, maxY)
	for(var xa = 0; xa < 2; xa++){
		for(var ya = 0; ya < 2; ya++){
			for(var za = 0; za < 2; za++){
				var d = Math.sqrt(xa * xa + ya * ya + za * za);
				var r = 2 - Math.random() * 2;
				if(d < r) ore.set(x + xa, y + ya, z + za, id, data, id2);
			}
		}
	}
}

World.generation.ore.type.Tiny = function(id, data, id2, maxY, x, z){
	x = Math.floor(Math.random() * 16) + x;
	z = Math.floor(Math.random() * 16) + z;
	var y = random(2, maxY);
	ore.set(x, y, z, id, data);
	if(Math.random() < 0.5){
		ore.set(x + random(-1, 1), y + random(-1, 1), z + random(-1, 1), id, data, id2);
	}
}

*/



var File = java.io.File;
var FileReader = java.io.FileReader;
var BufferedReader = java.io.BufferedReader;
var FOS = java.io.FileOutputStream;
var String = java.lang.String;
var StringBuilder = java.lang.StringBuilder;
var MediaPlayer = new android.media.MediaPlayer();

FileAPI = {
	media: {
		audio: {
			play: function(dir,looping){
				if(!looping) looping = false;
				if(!type) return;
				MediaPlayer.stop();
				MediaPlayer.reset();
				MediaPlayer.setDataSource(dir);
				MediaPlayer.prepare();
				MediaPlayer.setLooping(looping);
				MediaPlayer.start();
			},
			stop: function(){
				MediaPlayer.stop();
				MediaPlayer.reset();
			}
		},
		//video: null;
	},
	mnt: "/mnt",
	root: android.os.Environment.getExternalStorageDirectory().getAbsolutePath() + "/",
    getFullPath:function(a){
		a = new String(a);
		return a.startsWith(this.root) || a.startsWith(this.mnt) ? a : this.root + a
	},
    extractFile: function(a,b){
		try{
			b = this.getFullPath(b);
			var c = new java.io.BufferedOutputStream(new java.io.FileOutputStream(b));
			c.write(ModPE.getBytesFromTexturePack(a));
			c.flush();
			c.close(); 
		}catch(e){
			//print("error\n\n" +e.lineNumber + ":" + e)
		}
	},
	returnFile:function(dir, name){
		return (new File(dir, name));
	},
	isExists:function(file){
		return file.exists();
	},
	createFile:function(path, name){
		new File(path, name).createNewFile();
		return File;
	},
	createDir:function(dir, name){
		return (new File(dir, name).mkdir());
	},
	deleteFile:function(path){
		try{
			var file = new java.io.File(path);
			if(file.isFile()){
				file.delete();
			}
		}catch(e){
			Client.log("ERROR", "Error in deleting file\n" + e.message + " line: " + e.lineNumber);
		}
	},
	deleteDir:function(path){
		try{
			var filed = new java.io.File(path);
			if(filed.isDirectory()){
				var directoryFiles = filed.listFiles();
				for(var i in directoryFiles){
					ModAPI.FileAPI.deleteFile(directoryFiles[i].getAbsolutePath());
				}
				filed.delete();
			}
		}catch(e){
			Client.log("ERROR", "Error in deleting dir\n" + e.message + " line: " + e.lineNumber);
		}
	},
	readFile:function(file){
		var readed=(new BufferedReader(new FileReader(file)));
		var data=new StringBuilder();
		var string;
		while((string = readed.readLine()) != null){
			data.append(string);
			data.append('\n');
		}
		return data.toString();
	},
	readLine:function(file, line){
		var readT=new FileAPI.read(file);
		var lineArray=readT.split('\n');
		return lineArray[line-1];
	},
	writeInFile:function(file, text){
		FileAPI.rewriteInFile(file, (new FileAPI.readFile(file)) + text);
	},
	rewriteInFile:function(file, text){
		var writeFOS = new FOS(file);
		writeFOS.write(new String(text).getBytes());
	}
}

//Screen.initScreen();

function useItem(x, y, z, i, b, s, id, bd){
	try{
		ModEngine.addHook("useItem", x, y, z, i, b, s, id, bd);
		if(tools[i]) tools[i][0].useItem(x, y, z, b, i, s, id, bd);
	}catch(e){ 
		Client.log("ERROR", "at useItem\n"+e.message+" line: " + e.lineNumber) 
	}
	
	search_errors()
	if(converted_logs != ""){
		converted_logs = converted_logs.join("")
		Client.alert("ModEngine LOG", "<font face='calibri'>" + converted_logs)
	}
}

function destroyBlock(x, y, z, side){	
try{
	ModEngine.addHook("destroyBlock", x, y, z, side);
	itemID = Player.getCarriedItem(); 
	itemData = Player.getCarriedItemData();
	blockID = Level.getTile(x,y,z);
	blockData = Level.getData(x,y,z);
	tool = tools[itemID]
	block = blocks[blockID]
	
	if(tool){
		if(tool[0].destroyBlock){
		tool[0].destroyBlock(x,y,z, side, itemData, blockID, blockData, block.type, block.level);}
		else{
		if(itemData < Item.getMaxDamage(itemID))
		ModAPI.destroyItem(1, tool[0].destroyTool);}
	}
	block = blocks[getTile(x,y,z)]
	if(block){
		var enchant = {level:0}
		var enc = Player.getEnchantments(Player.getSelectedSlotId());
		for(var n in enc){
			if(enc[n].type==Enchantment.SILK_TOUCH) enchant = {type:"silk_touch", level: enc[n].level}
			if(enc[n].type==Enchantment.FORTUNE && !enchant.type) enchant = {type:"fortune", level: enc[n].level}
		}
		if(block.drop){
			Level.destroyBlock(x,y,z)
			block.drop(x,y,z, itemID, itemData, blockData, ModAPI.getMiningLevel(block), enchant)
		}
		else{
			if(tool && itemData < Item.getMaxDamage(itemID) && tool[0].blockTypes.indexOf(block.type)!==-1){
				if(blocksDrop[blockID]){
				blocksDrop[blockID](x,y,z, blockData, enchant);}
				else{
				Level.destroyBlock(x,y,z,true);}
			}
		}
	}
}catch(e){
	Client.log("ERROR", "at destroyBlock\n"+e.message+" line: " + e.lineNumber) 
}

	search_errors()
	if(converted_logs != ""){
		converted_logs = converted_logs.join("")
		Client.alert("ModEngine LOG", "<font face='calibri'>" + converted_logs)
	}
}

function startDestroyBlock(x, y, z, side){
try{
	ModEngine.addHook("startDestroyBlock", x, y, z, side);
	itemID = Player.getCarriedItem(); 
	itemData = Player.getCarriedItemData();
	blockID = Level.getTile(x,y,z);
	if(blockID == 73) blockID = 74
	tool = tools[itemID]
	block = blocks[blockID]
	if(block.time)
		Block.setDestroyTime(blockID, block.time);
	
	if(tool){
		if(tool[0].startDestroyBlock){
		tool[0].startDestroyBlock(x,y,z, side, itemData, blockID, block.type, block.level, block.time);}
		else{
			if(tool[0].blockTypes.indexOf(block.type)!==-1 && itemData<Item.getMaxDamage(itemID)){
				miningSpeed = getSpeed(tool[2])
				if(block.type == "stone" && tool[1] >= block.level) miningSpeed = miningSpeed * 10 / 3
				Block.setDestroyTime(blockID, block.time/miningSpeed);
			}
		}
	}
	else{
		tool = minecraftTools[itemID]
		if(tool && tool[0]==block.type && (!minecraftBlocks[block.type][block.level] || minecraftBlocks[block.type][block.level].indexOf(blockID)==-1)){
			if(block.type=="stone" && tool[1] < block.level){
				Block.setDestroyTime(blockID, block.time*10/3);
			}
			if(block.type=="dirt"){
				miningSpeed = getSpeed(tool[2])
				Block.setDestroyTime(blockID, block.time/miningSpeed);
			}
			if(block.type=="leaves"){
				Block.setDestroyTime(blockID, 0.04);
			}
		}
	}
}catch(e){
	Client.log("ERROR", "at startDestroyBlock\n"+e.message+" line: " + e.lineNumber) 
}

	search_errors()
	if(converted_logs != ""){
		converted_logs = converted_logs.join("")
		Client.alert("ModEngine LOG", "<font face='calibri'>" + converted_logs)
	}
}

function continueDestroyBlock(x, y, z, s){
try{
	ModEngine.addHook("continueDestroyBlock", x, y, z, s);
}catch(e){
	Client.log("ERROR", "at continueDestroyBlock\n"+e.message+" line: " + e.lineNumber) 
}
	search_errors()
	if(converted_logs != ""){
		converted_logs = converted_logs.join("")
		Client.alert("ModEngine LOG", "<font face='calibri'>" + converted_logs)
	}
}

function attackHook(a, v){
try{
	ModEngine.addHook("onAttack", a, v);
	itemID = Player.getCarriedItem();
	itemData = Player.getCarriedItemData();
	if(weapon_tick >= 10){
		weapon_tick = 0
		entHealth = Entity.getHealth(v); 
	if(weapon[itemID] && itemData < Item.getMaxDamage(itemID)){
		var damage = weapon[itemID][0]
		if(damage>Math.floor(damage)){
			if(Math.random() < damage - Math.floor(damage)){
				damage++;
			}
			damage = Math.floor(damage) 
		}
		var fire = weapon[itemID][1]
		ModAPI.destroyItem(1, weapon[itemID][2]);
		if(fire){
			Entity.setFireTicks(v, fire);
		}
		if(entHealth<=damage-2&&entHealth>1){
			Entity.setHealth(v, 1);
		} 
		if(entHealth > damage-2){
			Entity.setHealth(v, entHealth-damage+2);
		}
	}
	else {
		Entity.setHealth(v, entHealth + 1);}
	}
}catch(e){
	Client.log("ERROR", "at attackHook\n"+e.message+" line: " + e.lineNumber) 
}
	search_errors()
	if(converted_logs != ""){
		converted_logs = converted_logs.join("")
		Client.alert("ModEngine LOG", "<font face='calibri'>" + converted_logs)
	}
}

function getSpeed(speed){
	var enc = Player.getEnchantments(Player.getSelectedSlotId());
	var efficiency = 0
	for(var n in enc){
		if(enc[n].type==Enchantment.EFFICIENCY) efficiency = enc[n].level
	}
	if(!efficiency) return speed
	return speed*(Math.pow(1.3, Math.pow(2, efficiency-1)))
}

function chatHook(message){
try{
	ModEngine.addHook("onPlayerMessage", message);
}catch(e){
	
}
	search_errors()
	if(converted_logs != ""){
		converted_logs = converted_logs.join("")
		Client.alert("ModEngine LOG", "<font face='calibri'>" + converted_logs)
	}
}

function eatHook(h, s){
try{
	ModEngine.addHook("afterEating", h, s);
}catch(e){
	Client.log("ERROR", "at eatHook\n"+e.message+" line: " + e.lineNumber) 
}
	search_errors()
	if(converted_logs != ""){
		converted_logs = converted_logs.join("")
		Client.alert("ModEngine LOG", "<font face='calibri'>" + converted_logs)
	}

}

var expAdded = 0

function playerAddExpHook(player, experienceAdded){
try {
	if(!experienceAdded) expAdded = false
}catch(e){
	Client.log("ERROR", "at playerAddExpHook\n"+e.message+" line: " + e.lineNumber) 
}
	search_errors()
	if(converted_logs != ""){
		converted_logs = converted_logs.join("")
		Client.alert("ModEngine LOG", "<font face='calibri'>" + converted_logs)
	}
}

function entityAddedHook(added){
try{
	ModEngine.addHook("onEntitySpawn", added);
}catch(e){
	Client.log("ERROR", "at entityAddedHook\n"+e.message+" line: " + e.lineNumber) 
}
	search_errors()
	if(converted_logs != ""){
		converted_logs = converted_logs.join("")
		Client.alert("ModEngine LOG", "<font face='calibri'>" + converted_logs)
	}

}

function entityRemovedHook(removed){
try{
	ModEngine.addHook("afterEntityDelete", removed);
	exp = Entity.getExtraData(removed, "exp.count")
	if(exp&&!expAdded) Player.addExp(exp);
	expAdded = true
}catch(e){
	Client.log("ERROR", "at entityRemovedHook\n"+e.message+" line: " + e.lineNumber) 
}
	search_errors()
	if(converted_logs != ""){
		converted_logs = converted_logs.join("")
		Client.alert("ModEngine LOG", "<font face='calibri'>" + converted_logs)
	}
}

function explodeHook(exploded, x, y, z, p, f){
try{
	ModEngine.addHook("afterEntityExplode", x, y, z, p, f);
}catch(e){
	Client.log("ERROR", "at explodeHook\n"+e.message+" line: " + e.lineNumber) 
}

	search_errors()
	if(converted_logs != ""){
		converted_logs = converted_logs.join("")
		Client.alert("ModEngine LOG", "<font face='calibri'>" + converted_logs)
	}
}

function selectLevelHook(){
try{
	Data.path_saves = FileAPI.getFullPath("games/com.mojang/minecraftWorlds/" +  Level.getWorldDir() + "/mod_engine/saves");
	lang.get(ModPE.getLanguage());
	lang.edits();
	ModEngine.addHook("onSelectLevel");
	for(var id = 1; id < 256; id++){
		blocks[id].time = Math.floor(Block.getDestroyTime(id)*100)/100
	}
}catch(e){
	Client.log("ERROR", "at selectLevelHook\n"+e.message+" line: " + e.lineNumber) 
}

	search_errors()
	if(converted_logs != ""){
		converted_logs = converted_logs.join("")
		Client.alert("ModEngine LOG", "<font face='calibri'>" + converted_logs)
	}
}

function newLevel(){
try{
	player = getPlayerEnt();
	Client.message(ModAPI.startMessage())
	ModEngine.addHook("onPlayerJoin");
	ModEngine.addHook("defineItems");
	ModEngine.addHook("defineBlocks");
}catch(e){
	Client.log("ERROR", "at newLevel\n"+e.message+" line: " + e.lineNumber) 
}

	search_errors()
	if(converted_logs != ""){
		converted_logs = converted_logs.join("")
		Client.alert("ModEngine LOG", "<font face='calibri'>" + converted_logs)
	}
}

function procCmd(cmd){
try{
	ModEngine.addHook("command", cmd);
}catch(e){
	Client.log("ERROR", "at procCmd\n"+e.message+" line: " + e.lineNumber) 
}
	search_errors()
	if(converted_logs != ""){
		converted_logs = converted_logs.join("")
		Client.alert("ModEngine LOG", "<font face='calibri'>" + converted_logs)
	}
}

function modTick(){
try{
	ModEngine.addHook("everyTick");
	weapon_tick++;
}catch(e){
	Client.log("ERROR", "at modTick\n"+e.message+" line: " + e.lineNumber) 
}
	search_errors()
	if(converted_logs != ""){
		converted_logs = converted_logs.join("")
		Client.alert("ModEngine LOG", "<font face='calibri'>" + converted_logs)
	}
}

function redstoneUpdateHook(x, y, z, signal, wl, b, bd){
try{
	ModEngine.addHook("onRedstoneUpdate", x, y, z, signal, wl, b, bd);
}catch(e){
	Client.log("ERROR", "at redstoneUpdateHook\n"+e.message+" line: " + e.lineNumber) 
}
	search_errors()
	if(converted_logs != ""){
		converted_logs = converted_logs.join("")
		Client.alert("ModEngine LOG", "<font face='calibri'>" + converted_logs)
	}
}

ModEngine.callHook("everyTick", function(){
	if(config.dev == true)
		Client.tipMessage("X: " + Math.round(Player.getX()) + " Y: " + Math.round(Player.getY()) + " Z: " + Math.round(Player.getZ()) + "\nHAND - " + Player.getCarriedItem() + ":" + Player.getCarriedItemData() + "\nPITCH: " + Player.getPointedBlockId() + ":" + Player.getPointedBlockData());

})


function chatReceiverHook(mess, sender){
try{
	ModEngine.addHook("onPlayerSend", mess, sender);
}catch(e){
	Client.log("ERROR", "at chatReceiverHook\n"+e.message+" line: " + e.lineNumber) 
}
	search_errors()
	if(converted_logs != ""){
		converted_logs = converted_logs.join("")
		Client.alert("ModEngine LOG", "<font face='calibri'>" + converted_logs)
	}
}

ModAPI.defineItem = function(id, tex, texid, name, stack, foil){
	try{
		if(!foil) foil = false;
		if(!stack) stack = 64;

		ModPE.setItem(id, tex, texid, name, stack);
      	Item.setProperties(id, { 
			"category": "Tools",
			"max_stack_size": stack,
			"foil": foil
		});
		Player.addItemCreativeInv(id, 1, 0);
		ItemGUITextures[id+":0"] = [tex, texid];
	}catch(e){
		ModPE.setItem(id, "___missing_texture___", 0, "___missing_texture___", 64);
		Client.log("ERROR", "" + e.message + " line: " + e.lineNumber);
	}
}


ModAPI.defineBlock = function(id, data){
if(!data.stack) data.stack = 64;
var textures = data.textures;
var name = data.name;
var stack = data.stack;
try {
	Block.defineBlock(id, name, textures, 1, false, 0)
	//for(var i = 0; i < 16; i++)
		//Player.addItemCreativeInv(id, 1, i);
} catch(e) {
	Block.defineBlock(id, "___missing_texture___", [["___missing_texture___", 0]], 1, false, 0);
	Client.log("ERROR", "" + e.message + " line: " + e.lineNumber);
}

	Item.setProperties(id, { 
		"category": "Tools",
		"max_stack_size": stack
	});
}

Block.addDrop = function(id, data, drop, sound){
	if(!data) data = 0;
	if(!sound) sound = "dig.stone";
	if(!drop || !drop[0]) drop = [id,data,1];
	ModEngine.callHook("destroyBlock", function(x,y,z){
		if(getTile(x,y,z)==id && Level.getData(x,y,z) == data){
			preventDefault();
			Level.playSoundEnt(getPlayerEnt(), sound, 2000, 2000);
			setTile(x,y,z,0);
			Level.dropItem(x,y,z,0,drop[0],drop[2],drop[1])
		}
	});
}

ModAPI.defineSideBlock = function(id, data){
if(!data.stack) data.stack = 64;
var texs = data.textures;
var textures = [];

for(var i in texs)
	for(var c = 0; c <= 5; c++)
		textures.push(texs[i])

var name = data.name;
var stack = data.stack;
try {
	Block.defineBlock(id, name, textures, 1, false, 0)
	//for(var i = 0; i < 16; i++)
		//Player.addItemCreativeInv(id, 1, i);
} catch(e) {
	Block.defineBlock(id, "___missing_texture___", [["___missing_texture___", 0]], 1, false, 0);
	Client.log("ERROR", "" + e.message + " line: " + e.lineNumber);
}

	Item.setProperties(id, { 
		"category": "Tools",
		"max_stack_size": stack
	});
}



/*
ModAPI.defineBlock = function(id, name, tex, array){
	try{
		if(!time) time = 0.1;
		var stack = array.stack;
		var layer = array.layer;
		var time = array.time;
		Block.defineBlock(id, name, tex, 1, false, 0);
		if(array.shape){ 
			Block.setShape(id, array.shape[0],array.shape[1],array.shape[2],array.shape[3],array.shape[4],array.shape[5])
			if(!tex[1])
				BlockGUITextures[id+":0"] = [[tex[0][0],tex[0][1]],30]
			else BlockGUITextures[id+":0"] = [[tex[0][0],tex[0][1]],[tex[2][0],tex[2][1]],[tex[4][0],tex[4][1]],30]
		} else {
			if(!tex[1])
				BlockGUITextures[id+":0"] = [[tex[0][0],tex[0][1]],31]
			else BlockGUITextures[id+":0"] = [[tex[0][0],tex[0][1]],[tex[2][0],tex[2][1]],[tex[4][0],tex[4][1]],31]
		}
		Player.addItemCreativeInv(id, 1, 0);
		Block.setRenderLayer(id,layer)
		Block.setDestroyTime(id, time);
		Item.setProperties(id, { 
			"category": "Tools",
			"max_stack_size": stack
		});
	}catch(e){
		Block.defineBlock(id, "___missing_texture___", [["___missing_texture___", 0]], 1, false, 0);
		Client.alertError("DEFINE", "BLOCK", e);
	}
}
*/


var slot1,slot2,slot3,slot4,slot5,slot6,slot7,slot8,slot9,slot10,slot11,slot12,slot13,slot14,slot15,slot16,slot17,slot18,slot19,slot20,slot21,slot22,slot23,slot24,slot25,slot26,slot27,slot28,slot29,slot30,slot32,slot32,slot33,slot34,slot35,slot36;

var virtual_slots = [];
var item_image_cache = [];
var slot_type = {
standart: "standart",
fuel: "fuel",
input: "input",
add: function(name){
this.name = name;
}
}


var gui_bars = [];
var standart_bar_image_cache = [];



function standart_progress(x,y,width,height)
{
	var standart_bar_image = ModAPI.UI.util.scaleBitmap(ModAPI.UI.util.bitmap(ModAPI.UI.util.stream("spritesheet"),73,36,22,16),22,16);
    var standart_bar_image_bg = ModAPI.UI.util.scaleBitmap(ModAPI.UI.util.bitmap(ModAPI.UI.util.stream("spritesheet"),73,20,22,16),22,16);
	this.x = x;
	this.y = y;
	this.width = width || 22;
	this.height = height || 16;
	this.bar = undefined;
	this.progress = 0;
	this.isShowing = false;
	
	this.show = function(view)
	{
		if(this.isShowing) return;
		
		this.bar = ModAPI.UI.createWidget(new android.widget.ImageView(context),x,y,width,height);
		this.bar.setImageBitmap(standart_bar_image_bg);
		view.addView(this.bar);
		
		this.isShowing = true;
	}
	
	this.setProgress = function(progress)
	{
		if(progress < 0) progress = 0;
		if(progress > 1) progress = 1;
		
		this.progress = progress;
		var bar = this;
		var w = 22;
		var h = 16;
		
		var bg = standart_bar_image_cache[parseInt(progress*22)];
		if(bg) return ModAPI.UI.Thread(function()
		{
			if(!bar.isShowing) bar.show();
			bar.bar.setImageBitmap(bg);
		});
		
		var bitmap = android.graphics.Bitmap.createBitmap(w,h,android.graphics.Bitmap.Config.ARGB_8888);
		var rep = standart_bar_image;
		var b = standart_bar_image_bg;
		
		for(var x = 0; x < w; x++)
		{
			for(var y = 0; y < h; y++)
			{
				if(x < w*this.progress) bitmap.setPixel(x,y,rep.getPixel(x,y)); else bitmap.setPixel(x,y,b.getPixel(x,y));
			}
		}
		
		bitmap = android.graphics.Bitmap.createScaledBitmap(bitmap,w*8,h*8,false);
		standart_bar_image_cache[parseInt(progress*22)] = bitmap;
		
		ModAPI.UI.Thread(function()
		{
			if(!bar.isShowing) bar.show();
			bar.bar.setImageBitmap(bitmap);
		});
	}
	
	this.getProgress = function()
	{
		return this.progress;
	}
}


ModAPI.UI = {
	createWidget: function(view,x,y,width,height){
		var widget = view;
		var params = new android.widget.RelativeLayout.LayoutParams(width,height);
		params.setMargins(x,y,0,0);
		widget.setLayoutParams(params);
		return widget;
	},
	util: {
		bitmap:function(string,x,y,width,height){
			return new android.graphics.Bitmap.createBitmap(string,x,y,width,height);
		},
		stream:function(string){
			return new android.graphics.BitmapFactory.decodeStream(ModPE.openInputStreamFromTexturePack("images/gui/"+string+".png"));
		},
		stream_custom:function(string){
			return new android.graphics.BitmapFactory.decodeStream(ModPE.openInputStreamFromTexturePack("resources/gui/"+string+".png"));
		},
		scaleBitmap:function(bitmap,width,height){
			return android.graphics.Bitmap.createScaledBitmap(bitmap,width,height,false);
		},
		stretchBitmap:function(bitmap,x,y,sw,sh,w,h){
			var blank = android.graphics.Bitmap.createBitmap(w,h,android.graphics.Bitmap.Config.ARGB_8888);
			var part1 = android.graphics.Bitmap.createBitmap(bitmap,0,0,x,y);
			var part2 = android.graphics.Bitmap.createBitmap(bitmap,x,0,sw,y);
			var part3 = android.graphics.Bitmap.createBitmap(bitmap,x + sw,0,bitmap.getWidth() - x - sw,y);
			var part4 = android.graphics.Bitmap.createBitmap(bitmap,0,y,x,sh);
			var part5 = android.graphics.Bitmap.createBitmap(bitmap,x,y,sw,sh);
			var part6 = android.graphics.Bitmap.createBitmap(bitmap,x + sw,y,bitmap.getWidth() - x - sw,sh);
			var part7 = android.graphics.Bitmap.createBitmap(bitmap,0,y + sh,x,bitmap.getHeight() - y - sh);
			var part8 = android.graphics.Bitmap.createBitmap(bitmap,x,y + sh,sw,bitmap.getHeight() - y - sh);
			var part9 = android.graphics.Bitmap.createBitmap(bitmap,x + sw,y + sh,bitmap.getWidth() - x - sw,bitmap.getHeight() - y - sh);
			var canvas = new android.graphics.Canvas(blank);
			canvas.drawBitmap(part1,0,0,null);
			canvas.drawBitmap(android.graphics.Bitmap.createScaledBitmap(part2,w - bitmap.getWidth() + sw,y,false),x,0,null);
			canvas.drawBitmap(part3,w-bitmap.getWidth() + sw + x,0,null);
			canvas.drawBitmap(android.graphics.Bitmap.createScaledBitmap(part4,x,h - bitmap.getHeight() + sh,false),0,y,null);
			canvas.drawBitmap(android.graphics.Bitmap.createScaledBitmap(part5,w - bitmap.getWidth() + sw,h - bitmap.getHeight() + sh,false),x,y,null);
			canvas.drawBitmap(android.graphics.Bitmap.createScaledBitmap(part6,part3.getWidth(),h - bitmap.getHeight() + sh,false),w - bitmap.getWidth() + sw + x,y,null);
			canvas.drawBitmap(part7,0,h - bitmap.getHeight() + sh + y,null);
			canvas.drawBitmap(android.graphics.Bitmap.createScaledBitmap(part8,w - bitmap.getWidth() + sw,part7.getHeight(),false),x,h - bitmap.getHeight() + sh + y,null);
			canvas.drawBitmap(part9,w - bitmap.getWidth() + sw + x,h - bitmap.getHeight() + sh + y,null);
			return android.graphics.drawable.BitmapDrawable(blank);
		}
	},
	API: {
		goToUrl: function(url){
			var url_ = android.net.Uri.parse(url);
			var intent = new android.content.Intent(android.content.Intent.ACTION_VIEW, url_);
			context.startActivity(intent);
		},
		goToUrlAlert: function(url){
			ModAPI.UI.Thread(function(){
				var web = new android.webkit.WebView(context);
				var webset = web.getSettings();
				webset.setJavaScriptEnabled(true);
				web.setWebChromeClient(new android.webkit.WebChromeClient());
				web.setWebViewClient(new android.webkit.WebViewClient());
				web.loadUrl(url);
				new android.app.AlertDialog.Builder(context).setView(web).show();
			})
		},
		StandartBar: function(view,x,y,width,height){
			this.__bar = new standart_progress(x,y,width,height);
			this.__bar.show(view);
			gui_bars[gui_bars.length] = this.__bar;
			return this.__bar;
		},
		
		standart_button:function(text, textSize, f){
			this.button = new android.widget.Button(context);
			this.button.setText(text); 
			this.button.setTextSize(textSize);
			this.button.setOnClickListener(function(viewarg){
				if(f)
					f()
			});
			return this.button;
		},
		standart_dialog:function(title, text, textSize, touch, button1, button2, button3){
			ModAPI.UI.Thread(function(){
               if(!textSize) textSize = 20;
			this.dialog = new android.app.AlertDialog.Builder(context); 
			this.dialog.setTitle(title); 
			this.scroll = new android.widget.ScrollView(context);
			this.layout = new android.widget.LinearLayout(context);
			this.textview = new android.widget.TextView(context); 
			this.textview.setText(text);
			this.textview.setTextSize(textSize);
               if(!touch) this.dialog.setCancelable(touch);
               if(button1){
this.dialog.setPositiveButton(button1[0],button1[1]);
               }
               if(button2){
this.dialog.setNegativeButton(button2[0],button2[1]);
               }
               if(button3){
this.dialog.setNeutralButton(button3[0],button3[1]);
               }
			this.layout.addView(this.textview);
			this.scroll.addView(this.layout); 
			this.dialog.setView(this.scroll);
			this.dialog.create().show();
			return this.dialog;
			});
		},
		Button:function(text, x, y, width, height, actions, textSize){
				if(width >= height){
					var image = ModAPI.UI.util.stretchBitmap(ModAPI.UI.util.scaleBitmap(ModAPI.UI.util.bitmap(ModAPI.UI.util.stream("spritesheet"),8,32,8,8),dip*8,dip*8),parseInt(height/8),parseInt(height/8),parseInt(height/8),parseInt(height/8),parseInt(width),parseInt(height));
					var image2 = ModAPI.UI.util.stretchBitmap(ModAPI.UI.util.scaleBitmap(ModAPI.UI.util.bitmap(ModAPI.UI.util.stream("spritesheet"),0,32,8,8),dip*8,dip*8),parseInt(height/8),parseInt(height/8),parseInt(height/8),parseInt(height/8),parseInt(width),parseInt(height));
				}

				if(width < height){
					var image = ModAPI.UI.util.stretchBitmap(ModAPI.UI.util.scaleBitmap(ModAPI.UI.util.bitmap(ModAPI.UI.util.stream("spritesheet"),8,32,8,8),dip*8,dip*8),parseInt(width/8),parseInt(width/8),parseInt(width/8),parseInt(width/8),parseInt(width),parseInt(height));
					var image2 = ModAPI.UI.util.stretchBitmap(ModAPI.UI.util.scaleBitmap(ModAPI.UI.util.bitmap(ModAPI.UI.util.stream("spritesheet"),0,32,8,8),dip*8,dip*8),parseInt(width/8),parseInt(width/8),parseInt(width/8),parseInt(width/8),parseInt(width),parseInt(height));
				}
		  
			var button = ModAPI.UI.createWidget(new android.widget.Button(context),x,y,width,height);
			button.setBackgroundDrawable(image);
			button.setText(text);
			button.setTextSize(textSize);
			button.setTypeface(font);
			button.setTextColor(android.graphics.Color.parseColor("#DDDDDD"));
			button.setShadowLayer(1,dip*0.5,dip*0.5,android.graphics.Color.BLACK);
			button.setPadding(0,0,0,0);
			button.setOnTouchListener(function(view,event){
				var action = event.getAction();
				var Rect = new android.graphics.Rect(view.getLeft(),view.getTop(),view.getRight(),view.getBottom());
				if(Rect.contains(view.getLeft() + event.getX(), view.getTop() + event.getY())){
					view.setBackgroundDrawable(image2);
					view.setPadding(0,dip*1,0,0);
					view.setTextColor(android.graphics.Color.parseColor("#FBFF97"));
					if(action == 1){
						view.setBackgroundDrawable(image);
						view.setTextColor(android.graphics.Color.parseColor("#DDDDDD"));
						view.setPadding(0,0,0,0);
						actions();
						Level.playSoundEnt(getPlayerEnt(),"random.click",100);
					}
				}else{
					view.setBackgroundDrawable(image);
					view.setPadding(0,0,0,0);
					view.setTextColor(android.graphics.Color.parseColor("#DDDDDD"));
				}
				return true;
			});
			return button;
		},
		ButtonWithImage:function(icon, x, y, width, height, actions){
				this.layoutF = ModAPI.UI.createWidget(new android.widget.RelativeLayout(context),x,y,width,height)
				this.layout = ModAPI.UI.createWidget(new android.widget.RelativeLayout(context),x,y,width,height)
				this.layout2 = ModAPI.UI.createWidget(new android.widget.RelativeLayout(context),x,y,width,height)
				this.icon = icon;
				this.image = ModAPI.UI.createWidget(new android.widget.ImageView(context),(width-(width-dip*6))/2,(width-(width-dip*6))/2,width-dip*6,height-dip*6,function(){return true;});
				this.image.setImageBitmap(this.icon);
				this.button = ModAPI.UI.API.Button("",0,0,dip*23,dip*23,function(){
					actions();
				},tdip*4)
this.layout.addView(this.button)
this.layout2.addView(this.image)
this.layoutF.addView(this.layout)
this.layoutF.addView(this.layout2)
return this.layoutF;
		},
		TabButton:function(image, image2, x, y, width, height, action){
			var button = ModAPI.UI.createWidget(new android.widget.ImageView(context),x,y,width,height);
			button.setImageBitmap(image);
			button.setClickable(true);
			button.setOnTouchListener(function(view,event){
				var ac = event.getAction();
				var Rect = new android.graphics.Rect(view.getLeft(),view.getTop(),view.getRight(),view.getBottom());
				if(Rect.contains(view.getLeft() + event.getX(), view.getTop() + event.getY())){
					view.setImageBitmap(image2);
					if(ac == 1){
						view.setImageBitmap(image);
						action();
						Level.playSoundEnt(getPlayerEnt(),"random.click",100);
					}
				}else{
					view.setImageBitmap(image);
				}
				return true;
			});
			return button;
		},
		Text:function(x, y, text, size, color){
			this.text = new android.widget.TextView(context)
			this.text.setText(text);
			this.text.setTypeface(font);
			this.text.setTextSize(size);
			this.text.setTextColor(color);
			this.text.setShadowLayer(1,3,3,android.graphics.Color.BLACK);
			this.text.setPadding(x,y, 0, 0);
			return this.text;
		},
		Slot:function(x,y,actions){
if(!actions) actions = function(){return}
			this.x = x;
			this.y = y;
			this.data = this.count = this.id = 0;
			this.background = this.icon = this.text = null;
			this.currentIcon = null;
			var s = this;
			this.setItem = function(id,count,data){
				if(id != this.id && data != this.data) 
					this.currentIcon = ModAPI.UI.API.getItemIcon(id,data);
				this.id = id;
				this.data = data;
				this.count = count;
				ModAPI.UI.Thread(function(){
					s.icon.setBackgroundDrawable(android.graphics.drawable.BitmapDrawable(ModAPI.UI.API.getItemIcon(id,data)))
					if(count > 1 && count < 100) s.text.setText(count+"");
					else if(count < 1) s.text.setText("");
					else if(count >99) s.text.setText("99+");
				});
			};
			this.show = function(view){
				this.background = ModAPI.UI.createWidget(new android.widget.RelativeLayout(context),dip*(this.x),dip*(this.y),dip*20,dip*21);
				this.background.setBackgroundDrawable(android.graphics.drawable.BitmapDrawable(ModAPI.UI.util.scaleBitmap(ModAPI.UI.util.bitmap(ModAPI.UI.util.stream("gui"),200,44,16,18),dip*18,dip*18,false)));
				view.addView(this.background);
				this.icon = ModAPI.UI.createWidget(new android.widget.ImageView(context),dip*4,dip*6,dip*11.5,dip*12,function(){return true;});
				this.icon.setImageBitmap(null);
				this.background.addView(this.icon);
				this.text = ModAPI.UI.createWidget(new android.widget.TextView(context),dip*9,dip*12,dip*14,dip*14,function(){return true;});
				this.text.setText("");
				this.text.setTypeface(font);
				this.text.setTextSize(tdip*4);
				this.text.setTextColor(android.graphics.Color.parseColor("#DDDDDD"));
				this.text.setShadowLayer(1,3,3,android.graphics.Color.BLACK);
				this.background.addView(this.text);
			
var si = this;	this.background.setOnClickListener(function(view){
					actions();
				for(var i in virtual_slots){
var th = virtual_slots[i];
if(th.selected){
if(!th.avaible_items){
if((si.id == th.id && si.data == th.data) || th.id == 0){
if(th.count == 0){ 
th.setItem(si.id,1,si.data)
si.setItem(si.id, si.count-1, si.data)
}
else if(th.count>0) {
th.setItem(si.id, th.count+1, si.data)
si.setItem(si.id, si.count-1, si.data)
}
if(si.count == 1){
si.setItem(si.id,0,si.data)
si.setItem(si.id,1,si.data)
}
if(si.count == 0){
si.setItem(0,0,0)
}
}
} else if(th.avaible_items){
for(var i in th.avaible_items){
	if(!Array.isArray(th.avaible_items[i])){
if(((si.id == th.id && si.data == th.data) || th.id == 0) && si.id == th.avaible_items[i]){
if(th.count == 0){ 
th.setItem(si.id,1,si.data)
si.setItem(si.id, si.count-1, si.data)
}
else if(th.count>0) {
th.setItem(si.id, th.count+1, si.data)
si.setItem(si.id, si.count-1, si.data)
}
if(si.count == 1){
si.setItem(si.id,0,si.data)
si.setItem(si.id,1,si.data)
}
if(si.count == 0){
si.setItem(0,0,0)
}}} else if(Array.isArray(th.avaible_items[i])){
	if(((si.id == th.id && si.data == th.data) || th.id == 0) && si.id == th.avaible_items[i][0] && si.data == th.avaible_items[i][1]){
if(th.count == 0){ 
th.setItem(si.id,1,si.data)
si.setItem(si.id, si.count-1, si.data)
}
else if(th.count>0 && th.count < th.avaible_items[i][2]) {
th.setItem(si.id, th.count+1, si.data)
si.setItem(si.id, si.count-1, si.data)
}
if(si.count == 1){
si.setItem(si.id,0,si.data)
si.setItem(si.id,1,si.data)
}
if(si.count == 0){
si.setItem(0,0,0)
}}
}

}
}
}
}
	Level.playSoundEnt(getPlayerEnt(),"random.click",100);
return
				});
			};
			this.update = function(id,count,data){
				
			};
		},
		SlotV:function(x, y, actions){
if(!actions.function) actions.function = function(){return};
if(!actions.type) actions.type = "standart";
if(!actions.uid) actions.uid = "global";
if(actions.avaible)
this.avaible_items = actions.avaible;
this.func = actions.function;
this.type = actions.type;
this.uid = actions.uid;
			this.dataVirtual = {};
			this.x = x;
			this.y = y;
			this.data = this.count = this.id = 0;
			this.background = this.icon = this.text = null;
			this.currentIcon = null;
			this.selected = false;
			virtual_slots.push(this)
			this.show = function(view){
				this.main_bg = ModAPI.UI.createWidget(new android.widget.RelativeLayout(context),dip*(this.x),dip*(this.y),dip*33,dip*33);
				this.background = ModAPI.UI.createWidget(new android.widget.RelativeLayout(context),dip*3,dip*3,dip*27,dip*27);
				this.background.setBackgroundDrawable(ModAPI.UI.util.stretchBitmap(ModAPI.UI.util.scaleBitmap(ModAPI.UI.util.bitmap(ModAPI.UI.util.stream("spritesheet"),0,32,8,8),dip*8,dip*8,false),parseInt((dip*8)/8),parseInt((dip*8)/8),parseInt((dip*8)/8),parseInt((dip*8)/8),parseInt((dip*30)),parseInt((dip*30))));
				view.addView(this.main_bg)
				this.icon = ModAPI.UI.createWidget(new android.widget.ImageView(context),dip*4.5,dip*5,dip*17.5,dip*18,function(){return true;});
				this.icon.setImageBitmap(null);
				this.bimage = ModAPI.UI.createWidget(new android.widget.RelativeLayout(context),0,0,dip*33,dip*33,function(){return true;});
				this.border = ModAPI.UI.util.stretchBitmap(ModAPI.UI.util.scaleBitmap(ModAPI.UI.util.bitmap(ModAPI.UI.util.stream("spritesheet"),10,42,16,16),dip*16,dip*16,false),parseInt((dip*33)/6),parseInt((dip*33)/6),parseInt((dip*33)/6),parseInt((dip*33)/6),parseInt(dip*33),parseInt(dip*33));
				this.background.addView(this.icon);
				this.text = ModAPI.UI.createWidget(new android.widget.TextView(context),dip*15,dip*15,dip*18,dip*18,function(){return true;});
				this.text.setText("");
				this.text.setTypeface(font);
				this.text.setTextSize(tdip*6);
				this.text.setTextColor(android.graphics.Color.parseColor("#DDDDDD"));
				this.text.setShadowLayer(1,3,3,android.graphics.Color.BLACK);
				this.background.addView(this.text);
				this.main_bg.addView(this.background)
				this.main_bg.addView(this.bimage);
				var s = this;
				this.background.setOnClickListener(function(view){
					if(!s.selected){
					s.bimage.setBackgroundDrawable(s.border);
for(var i in virtual_slots){
var th = virtual_slots[i];
if(th.selected){
th.selected = false;
th.bimage.setBackgroundDrawable(null);
}
}
					s.selected = true;
return;
					}
                if(s.selected && s.id != 0){
                addItemInventory(s.id, s.count, s.data)
actions.function();
return;
}
					//else {s.bimage.setBackgroundDrawable(null); s.selected = !s.selected;}
					Level.playSoundEnt(getPlayerEnt(),"random.click",100);
				});
			};
			this.setItem = function(id,count,data){
				var s = this;
				if(id != this.id && data != this.data) this.currentIcon = ModAPI.UI.API.getItemIcon(id,data);
				this.id = id;
				this.data = data;
				this.count = count;
				this.dataVirtual.id = id; this.dataVirtual.data = data; this.dataVirtual.count = count;
				
				ModAPI.UI.Thread(function(){
					s.icon.setBackgroundDrawable(android.graphics.drawable.BitmapDrawable(ModAPI.UI.API.getItemIcon(id,data)))
					if(count > 1 && count < 100) s.text.setText(count+"");
					else if(count < 1) s.text.setText("");
					else if(count >99) s.text.setText("99+");
				});
			};
			this.update = function(id,count,data){
				ModAPI.UI.Thread(function(){
				
				});
			};
		},
		getItemIcon:function(id,data){
var cached = item_image_cache[id+":"+data];
if(cached){ return cached
}

			if(id>255){
				/*function stream(string){
					return new android.graphics.BitmapFactory.decodeStream(ModPE.openInputStreamFromTexturePack("images/items/"+string+".png"));
				}
				function stream_(string){
					return new android.graphics.BitmapFactory.decodeStream(ModPE.openInputStreamFromTexturePack("resources/items/"+string+".png"));
				}
				if(!Array.isArray(GUIItems[id+":"+data]))
					var item = stream(GUIItems[id+":"+data]);
				if(Array.isArray(GUIItems[id+":"+data]))
					var item = stream_(GUIItems[id+":"+data][0]);
				
				var bitmap = new android.graphics.Bitmap.createBitmap(item,0,0,16,16)
				bitmap = android.graphics.Bitmap.createScaledBitmap(bitmap,dip*(32),dip*(32),false);
				return bitmap;*/
				
				
				var item = getItemTextureByID(id,data);
	var item2 = getItemTextureByID(id,0);
	var texture;
	var index;
	if(item)
	{
		texture = item[0];
		index = item[1];
	}else if(item2){
		texture = item2[0];
		index = item2[1];
	}
	if(!texture) return NO_ID;
	var items = net.zhuoweizhang.mcpelauncher.texture.tga.TGALoader.load(ModPE.openInputStreamFromTexturePack("images/items-opaque.tga"), false);
	var map = items_meta[items_meta_mapped.indexOf(texture)];
	if(!map) return NO_ID;
	var uvs = map.uvs[index];
	
	var x = uvs[0];
	var y = uvs[1];
	var width = uvs[2]-x;
	var height = uvs[3]-y;
	
	var bitmap = android.graphics.Bitmap.createBitmap(items,x,y,width,height);
	bitmap = android.graphics.Bitmap.createScaledBitmap(bitmap,32,32,false);
	
	/*if(data > 0 && GUIItemsMaxDamage[id])
	{
		var max = GUIItemsMaxDamage[id];
		var length = parseInt(bitmap.getWidth()*15/16 - data/max*bitmap.getWidth()*15/16);
		var datClr = parseInt(data/max*255);
		for(var x = bitmap.getWidth()/16; x < bitmap.getWidth()*15/16; x++)
		{
			var color = android.graphics.Color.argb(200,49,61,0);
			if(x > bitmap.getWidth()*13.5/16) color = android.graphics.Color.BLACK;
			if(x < length) color = android.graphics.Color.rgb(datClr,255 - datClr,0);
			
			for(var y = bitmap.getHeight()/16*13.3; y < bitmap.getHeight()/16*14; y++) bitmap.setPixel(x,y,color);
		}
	}*/
	bitmap = android.graphics.Bitmap.createScaledBitmap(bitmap,64,64,false);
item_image_cache[id+":"+data] = bitmap;
	return bitmap;
			}
			if(id<256&&id!=0){
				if(!data) data = 0;
				var bitmap = getGUIBlockIcon(id,data,dip*82,dip*82)
item_image_cache[id+":"+data] = bitmap;
				return bitmap;
			}
			if(id==0){
				var bitmap3 = android.graphics.Bitmap.createBitmap(1,1,android.graphics.Bitmap.Config.ARGB_8888);
			}
		},
	},
	Templates: {
		PlayerInventory: function (){
			this.playerInventory = ModAPI.UI.createWidget(new android.widget.RelativeLayout(context),dip*5,dip*20,dip*80,Screen.height/1.2);
			this.scroll = new android.widget.ScrollView(context);
			this.invLayout = ModAPI.UI.createWidget(new android.widget.RelativeLayout(context),dip*5,dip*20,dip*80,Screen.height/1.2);
			this.scroll.addView(this.invLayout)
			this.playerInventory.addView(this.scroll);
			 
			this.bitmap = ModAPI.UI.util.bitmap(ModAPI.UI.util.stream_custom("bg_inv"),0,0,16,16);
			this.bitmap = ModAPI.UI.util.scaleBitmap(this.bitmap,dip*16,dip*16);
			this.bitmap = ModAPI.UI.util.stretchBitmap(this.bitmap,parseInt((dip*80)/16),parseInt((dip*80)/16),parseInt((dip*80)/16),parseInt((dip*80)/16),parseInt(dip*80),parseInt(dip*100));
			this.playerInventory.setBackgroundDrawable(this.bitmap);
			// this.layout.addView(invLayout2);
			
			this.slotId1 = [Player.getInventorySlot(9),Player.getInventorySlotData(9),Player.getInventorySlotCount(9)]
			this.slotId2 = [Player.getInventorySlot(10),Player.getInventorySlotData(10),Player.getInventorySlotCount(10)]
			this.slotId3 = [Player.getInventorySlot(11),Player.getInventorySlotData(11),Player.getInventorySlotCount(11)]
			this.slotId4 = [Player.getInventorySlot(12),Player.getInventorySlotData(12),Player.getInventorySlotCount(12)]
			this.slotId5 = [Player.getInventorySlot(13),Player.getInventorySlotData(13),Player.getInventorySlotCount(13)]
			this.slotId6 = [Player.getInventorySlot(14),Player.getInventorySlotData(14),Player.getInventorySlotCount(14)]
			this.slotId7 = [Player.getInventorySlot(15),Player.getInventorySlotData(15),Player.getInventorySlotCount(15)]
			this.slotId8 = [Player.getInventorySlot(16),Player.getInventorySlotData(16),Player.getInventorySlotCount(16)]
			this.slotId9 = [Player.getInventorySlot(17),Player.getInventorySlotData(17),Player.getInventorySlotCount(17)]
			this.slotId10 = [Player.getInventorySlot(18),Player.getInventorySlotData(18),Player.getInventorySlotCount(18)]
			this.slotId11 = [Player.getInventorySlot(19),Player.getInventorySlotData(19),Player.getInventorySlotCount(19)]
			this.slotId12 = [Player.getInventorySlot(20),Player.getInventorySlotData(20),Player.getInventorySlotCount(20)]
			this.slotId13 = [Player.getInventorySlot(21),Player.getInventorySlotData(21),Player.getInventorySlotCount(21)]
			this.slotId14 = [Player.getInventorySlot(22),Player.getInventorySlotData(22),Player.getInventorySlotCount(22)]
			this.slotId15 = [Player.getInventorySlot(23),Player.getInventorySlotData(23),Player.getInventorySlotCount(23)]
			this.slotId16 = [Player.getInventorySlot(24),Player.getInventorySlotData(24),Player.getInventorySlotCount(24)]
			this.slotId17 = [Player.getInventorySlot(25),Player.getInventorySlotData(25),Player.getInventorySlotCount(25)]
			this.slotId18 = [Player.getInventorySlot(26),Player.getInventorySlotData(26),Player.getInventorySlotCount(26)]
			this.slotId19 = [Player.getInventorySlot(27),Player.getInventorySlotData(27),Player.getInventorySlotCount(27)]
			this.slotId20 = [Player.getInventorySlot(28),Player.getInventorySlotData(28),Player.getInventorySlotCount(28)]
			this.slotId21 = [Player.getInventorySlot(29),Player.getInventorySlotData(29),Player.getInventorySlotCount(29)]
			this.slotId22 = [Player.getInventorySlot(30),Player.getInventorySlotData(30),Player.getInventorySlotCount(30)]
			this.slotId23 = [Player.getInventorySlot(31),Player.getInventorySlotData(31),Player.getInventorySlotCount(31)]
			this.slotId24 = [Player.getInventorySlot(32),Player.getInventorySlotData(32),Player.getInventorySlotCount(32)]
			this.slotId25 = [Player.getInventorySlot(33),Player.getInventorySlotData(33),Player.getInventorySlotCount(33)]
			this.slotId26 = [Player.getInventorySlot(34),Player.getInventorySlotData(34),Player.getInventorySlotCount(34)]
			this.slotId27 = [Player.getInventorySlot(35),Player.getInventorySlotData(35),Player.getInventorySlotCount(35)]
			this.slotId28 = [Player.getInventorySlot(36),Player.getInventorySlotData(36),Player.getInventorySlotCount(36)]
			this.slotId29 = [Player.getInventorySlot(37),Player.getInventorySlotData(37),Player.getInventorySlotCount(37)]
			this.slotId30 = [Player.getInventorySlot(38),Player.getInventorySlotData(38),Player.getInventorySlotCount(38)]
			this.slotId31 = [Player.getInventorySlot(39),Player.getInventorySlotData(39),Player.getInventorySlotCount(39)]
			this.slotId32 = [Player.getInventorySlot(40),Player.getInventorySlotData(40),Player.getInventorySlotCount(40)]
			this.slotId33 = [Player.getInventorySlot(41),Player.getInventorySlotData(41),Player.getInventorySlotCount(41)]
			this.slotId34 = [Player.getInventorySlot(42),Player.getInventorySlotData(42),Player.getInventorySlotCount(42)]
			this.slotId35 = [Player.getInventorySlot(43),Player.getInventorySlotData(43),Player.getInventorySlotCount(43)]
			this.slotId36 = [Player.getInventorySlot(44),Player.getInventorySlotData(44),Player.getInventorySlotCount(44)]
			
			/*
				var bar = new addProgressBarToGUI(this.layout,dip*150,dip*70,100,30)
				bar.setProgress(0.1)
			*/
			
			//print(this.id_ +":"+ this.data_ +":"+ this.count_);
			slot1 = new ModAPI.UI.API.Slot(0,-2);
			slot1.show(this.invLayout);
			slot1.setItem(this.slotId1[0],this.slotId1[2],this.slotId1[1])
			id__ = slot1.id
 data__ = slot1.data
count__ = slot1.count;

			slot2 = new ModAPI.UI.API.Slot(20,-2);
			slot2.show(this.invLayout);
			slot2.setItem(this.slotId2[0],this.slotId2[2],this.slotId2[1])

			slot3 = new ModAPI.UI.API.Slot(40,-2);
			slot3.show(this.invLayout);
			slot3.setItem(this.slotId3[0],this.slotId3[2],this.slotId3[1])

			slot4 = new ModAPI.UI.API.Slot(60,-2);
			slot4.show(this.invLayout);
			slot4.setItem(this.slotId4[0],this.slotId4[2],this.slotId4[1])

			slot5 = new ModAPI.UI.API.Slot(0,17);
			slot5.show(this.invLayout);
			slot5.setItem(this.slotId5[0],this.slotId5[2],this.slotId5[1])

			slot6 = new ModAPI.UI.API.Slot(20,17);
			slot6.show(this.invLayout);
			slot6.setItem(this.slotId6[0],this.slotId6[2],this.slotId6[1])

			slot7 = new ModAPI.UI.API.Slot(40,17);
			slot7.show(this.invLayout);
			slot7.setItem(this.slotId7[0],this.slotId7[2],this.slotId7[1])

			slot8 = new ModAPI.UI.API.Slot(60,17);
			slot8.show(this.invLayout);
			slot8.setItem(this.slotId8[0],this.slotId8[2],this.slotId8[1])

			slot9 = new ModAPI.UI.API.Slot(0,36);
			slot9.show(this.invLayout);
			slot9.setItem(this.slotId9[0],this.slotId9[2],this.slotId9[1])

			slot10 = new ModAPI.UI.API.Slot(20,36);
			slot10.show(this.invLayout);
			slot10.setItem(this.slotId10[0],this.slotId10[2],this.slotId10[1])

			slot11 = new ModAPI.UI.API.Slot(40,36);
			slot11.show(this.invLayout);
			slot11.setItem(this.slotId11[0],this.slotId11[2],this.slotId11[1])

			slot12 = new ModAPI.UI.API.Slot(60,36);
			slot12.show(this.invLayout);
			slot12.setItem(this.slotId12[0],this.slotId12[2],this.slotId12[1])

			slot13 = new ModAPI.UI.API.Slot(0,55);
			slot13.show(this.invLayout);
			slot13.setItem(this.slotId13[0],this.slotId13[2],this.slotId13[1])

			slot14 = new ModAPI.UI.API.Slot(20,55);
			slot14.show(this.invLayout);
			slot14.setItem(this.slotId14[0],this.slotId14[2],this.slotId14[1])

			slot15 = new ModAPI.UI.API.Slot(40,55);
			slot15.show(this.invLayout);
			slot15.setItem(this.slotId15[0],this.slotId15[2],this.slotId15[1])

			slot16 = new ModAPI.UI.API.Slot(60,55);
			slot16.show(this.invLayout);
			slot16.setItem(this.slotId16[0],this.slotId16[2],this.slotId16[1])

			slot17 = new ModAPI.UI.API.Slot(0,74);
			slot17.show(this.invLayout);
			slot17.setItem(this.slotId17[0],this.slotId17[2],this.slotId17[1])

			slot18 = new ModAPI.UI.API.Slot(20,74);
			slot18.show(this.invLayout);
			slot18.setItem(this.slotId18[0],this.slotId18[2],this.slotId18[1])

			slot19 = new ModAPI.UI.API.Slot(40,74);
			slot19.show(this.invLayout);
			slot19.setItem(this.slotId19[0],this.slotId19[2],this.slotId19[1])

			slot20 = new ModAPI.UI.API.Slot(60,74);
			slot20.show(this.invLayout);
			slot20.setItem(this.slotId20[0],this.slotId20[2],this.slotId20[1])

			slot21 = new ModAPI.UI.API.Slot(0,93);
			slot21.show(this.invLayout);
			slot21.setItem(this.slotId21[0],this.slotId21[2],this.slotId21[1])

			slot22 = new ModAPI.UI.API.Slot(20,93);
			slot22.show(this.invLayout);
			slot22.setItem(this.slotId22[0],this.slotId22[2],this.slotId22[1])

			slot23 = new ModAPI.UI.API.Slot(40,93);
			slot23.show(this.invLayout);
			slot23.setItem(this.slotId23[0],this.slotId23[2],this.slotId23[1])

			slot24 = new ModAPI.UI.API.Slot(60,93);
			slot24.show(this.invLayout);
			slot24.setItem(this.slotId24[0],this.slotId24[2],this.slotId24[1])

			slot25 = new ModAPI.UI.API.Slot(0,112);
			slot25.show(this.invLayout);
			slot25.setItem(this.slotId25[0],this.slotId25[2],this.slotId25[1])

			slot26 = new ModAPI.UI.API.Slot(20,112);
			slot26.show(this.invLayout);
			slot26.setItem(this.slotId26[0],this.slotId26[2],this.slotId26[1])

			slot27 = new ModAPI.UI.API.Slot(40,112);
			slot27.show(this.invLayout);
			slot27.setItem(this.slotId27[0],this.slotId27[2],this.slotId27[1])

			slot28 = new ModAPI.UI.API.Slot(60,112);
			slot28.show(this.invLayout);
			slot28.setItem(this.slotId28[0],this.slotId28[2],this.slotId28[1])

			slot29 = new ModAPI.UI.API.Slot(0,131);
			slot29.show(this.invLayout);
			slot29.setItem(this.slotId29[0],this.slotId29[2],this.slotId29[1])

			slot30 = new ModAPI.UI.API.Slot(20,131);
			slot30.show(this.invLayout);
			slot30.setItem(this.slotId30[0],this.slotId30[2],this.slotId30[1])

			slot31 = new ModAPI.UI.API.Slot(40,131);
			slot31.show(this.invLayout);
			slot31.setItem(this.slotId31[0],this.slotId31[2],this.slotId31[1])

			slot32 = new ModAPI.UI.API.Slot(60,131);
			slot32.show(this.invLayout);
			slot32.setItem(this.slotId32[0],this.slotId32[2],this.slotId32[1])

			slot33 = new ModAPI.UI.API.Slot(0,150);
			slot33.show(this.invLayout);
			slot33.setItem(this.slotId33[0],this.slotId33[2],this.slotId33[1])

			slot34 = new ModAPI.UI.API.Slot(20,150);
			slot34.show(this.invLayout);
			slot34.setItem(this.slotId34[0],this.slotId34[2],this.slotId34[1])

			slot35 = new ModAPI.UI.API.Slot(40,150);
			slot35.show(this.invLayout);
			slot35.setItem(this.slotId35[0],this.slotId35[2],this.slotId35[1])

			slot36 = new ModAPI.UI.API.Slot(60,150);
			slot36.show(this.invLayout);
			slot36.setItem(this.slotId36[0],this.slotId36[2],this.slotId36[1])
			
			return this.playerInventory;
		},
		Background: function (width, height, dark_theme, with_topPanel, title_topPanel, notADD) {
			if(!width) width = Screen.width;
			if(!height) height = Screen.height;
			
			this.main_layout = new android.widget.RelativeLayout(context);
			this.side_layout = ModAPI.UI.createWidget(new android.widget.RelativeLayout(context),(Screen.width-width)/2,(Screen.height-height)/2,width,height);
			if(!notADD) this.main_layout.addView(this.side_layout);
			
			this.bitmap = ModAPI.UI.util.bitmap(ModAPI.UI.util.stream("spritesheet"),34,43,14,14);
			this.bitmap = ModAPI.UI.util.scaleBitmap(this.bitmap,dip*(14),dip*(14));
			if(width >= height)
				this.bitmap = ModAPI.UI.util.stretchBitmap(this.bitmap,parseInt(Screen.height*1.2/(dip*14)),parseInt(Screen.height*1.2/(dip*14)),parseInt(Screen.height*1.2/(dip*14)),parseInt(Screen.height*1.2/(dip*14)),parseInt(Screen.width*1.2),parseInt(Screen.height*1.2));
			if(width < height)
				this.bitmap = ModAPI.UI.util.stretchBitmap(this.bitmap,parseInt(Screen.width*1.2/(dip*14)),parseInt(Screen.width*1.2/(dip*14)),parseInt(Screen.width*1.2/(dip*14)),parseInt(Screen.width*1.2/(dip*14)),parseInt(Screen.width*1.2),parseInt(Screen.height*1.2));
			
			this.side_layout.setBackgroundDrawable(this.bitmap);
			
			if(dark_theme) this.main_layout.setBackgroundDrawable(android.graphics.drawable.ColorDrawable(android.graphics.Color.argb(190,0,0,0)));	
			
				/*this.exitTab.addView(this.exitTabImage);
			}*/
			/*
			if(with_exitButton){
				this.exitTab = ModAPI.UI.createWidget(new android.widget.RelativeLayout(context),Screen.width-dip*15.8,dip*-5.1,dip*(15.9),dip*(15.9));
				this.exitTabImage = ModAPI.UI.API.TabButton(ModAPI.UI.util.scaleBitmap(ModAPI.UI.util.bitmap(ModAPI.UI.util.stream("spritesheet"),60,0,18,18),dip*(18),dip*(18)),ModAPI.UI.util.scaleBitmap(ModAPI.UI.util.bitmap(ModAPI.UI.util.stream("spritesheet"),78,0,18,18),dip*(18),dip*(18)),dip*(5),dip*(5),dip*(15),dip*(15),function(){
					      if(window__){
     					    window__.dismiss();
   					      window__ = null
					     }
					if(initGUI.event_exitButton) initGUI.event_exitButton();
				});
				*/
			
			if(with_topPanel){
				this.Up = ModAPI.UI.createWidget(new android.widget.RelativeLayout(context),0,0,Screen.width,dip*(15.5));
				this.upbitmap = ModAPI.UI.util.bitmap(ModAPI.UI.util.stream("touchgui"),154,27,7,25);
				this.upbitmap = ModAPI.UI.util.scaleBitmap(this.upbitmap,dip*(15.5),dip*(15.5));
				this.upbitmap = ModAPI.UI.util.stretchBitmap(this.upbitmap,parseInt((dip*15.5)/15.5),parseInt((dip*15.5)/15.5),parseInt((dip*15.5)/15.5),parseInt((dip*15.5)/15.5),(Screen.width),parseInt(dip*(15.5)));
				this.Up.setBackgroundDrawable(this.upbitmap);
				if(title_topPanel){
					this.ttt = title_topPanel;
					this.textview = new android.widget.TextView(context);
					this.textview.setText(this.ttt);
					this.textview.setTextSize(tdip*4);
					this.textview.setPadding(width/2-this.ttt.length*dip*1.65, dip*5, 0, 0);
					this.textview.setTypeface(font);
					this.textview.setShadowLayer(1,3,3,android.graphics.Color.BLACK);
					this.textview.setTextColor(android.graphics.Color.WHITE);
					this.Up.addView(this.textview);
				}
			
				this.Shadow = ModAPI.UI.createWidget(new android.widget.RelativeLayout(context),0,dip*14.8,Screen.width,dip*(4));
				this.shadowbitmap = ModAPI.UI.util.bitmap(ModAPI.UI.util.stream("touchgui"),154,52,7,6);
				this.shadowbitmap = ModAPI.UI.util.scaleBitmap(this.shadowbitmap,dip*(15.5),dip*(15.5));
				this.shadowbitmap = ModAPI.UI.util.stretchBitmap(this.shadowbitmap,parseInt((dip*15.5)/15.5),parseInt((dip*15.5)/15.5),parseInt((dip*15.5)/15.5),parseInt((dip*15.5)/15.5),Screen.width,parseInt(dip*(15.5)));
				this.Shadow.setBackgroundDrawable(this.shadowbitmap);
				this.side_layout.addView(this.Shadow);
				this.side_layout.addView(this.Up);
			}
			if(title_topPanel && !with_topPanel){
					this.ttt = title_topPanel;
					this.textview = new android.widget.TextView(context);
					this.textview.setText(this.ttt);
					this.textview.setTextSize(tdip*4);
					this.textview.setPadding(width/2-this.ttt.length*dip*1.65, dip*5, 0, 0);
					this.textview.setTypeface(font);
					this.textview.setShadowLayer(1,3,3,android.graphics.Color.BLACK);
					this.textview.setTextColor(android.graphics.Color.WHITE);
					this.side_layout.addView(this.textview);
				}
			return [this.main_layout,this.side_layout]
		}
	}
}

var window;

var FirepitUPTIME = 200;
var FirepitRECIPES = [[[280,0], [281,0]]]
var FirepitACTIVE = false;
var FirepitCURRENT = [];

var initGUI = {
menuModList:function(){
ModAPI.UI.open(function(){
//this.test = ModAPI.UI.Templates.Background(dip*100,dip*50,dip*10, dip*10);
//this.layout.addView(this.test)

this.layout = ModAPI.UI.Templates.Background(Screen.width, Screen.height, true, true, "Firepit");
this.exitTab = ModAPI.UI.createWidget(new android.widget.RelativeLayout(context),Screen.width-dip*15.8,dip*-5.1,dip*(15.9),dip*(15.9));
this.exitTabImage = ModAPI.UI.API.TabButton(ModAPI.UI.util.scaleBitmap(ModAPI.UI.util.bitmap(ModAPI.UI.util.stream("spritesheet"),60,0,18,18),dip*(18),dip*(18)),ModAPI.UI.util.scaleBitmap(ModAPI.UI.util.bitmap(ModAPI.UI.util.stream("spritesheet"),78,0,18,18),dip*(18),dip*(18)),dip*(5),dip*(5),dip*(15),dip*(15),function(){
	closeWindow(this.window)
});
this.exitTab.addView(this.exitTabImage);
this.layout[0].addView(this.exitTab)
this.slot1 = new ModAPI.UI.API.SlotV(100,30,{avaible:[280], uid:"firepit", type: slot_type.input});
this.slot1.show(this.layout[1]);
this.slot1.setItem(0,0,0)

this.slot2 = new ModAPI.UI.API.SlotV(135,30, {avaible:[280], uid:"firepit", type: slot_type.input});
this.slot2.show(this.layout[1]);
this.slot2.setItem(0,0,0)

this.slot3 = new ModAPI.UI.API.SlotV(117.5,92, {uid:"firepit", type: slot_type.standart});
this.slot3.show(this.layout[1]);
this.slot3.setItem(0,0,0)

this.slot4 = new ModAPI.UI.API.SlotV(220,17,{avaible:[[5,0,1]], uid:"firepit", type: slot_type.fuel});
this.slot4.show(this.layout[1]);
this.slot4.setItem(0,0,0)

this.slot5 = new ModAPI.UI.API.SlotV(220,48,{avaible:[[5,0,1]], uid:"firepit", type: slot_type.fuel});
this.slot5.show(this.layout[1]);
this.slot5.setItem(0,0,0)

this.slot6 = new ModAPI.UI.API.SlotV(220,79,{avaible:[[5,0,1]], uid:"firepit", type: slot_type.fuel});
this.slot6.show(this.layout[1]);
this.slot6.setItem(0,0,0)

this.slot7 = new ModAPI.UI.API.SlotV(220,110,{avaible:[[5,0,1]], uid:"firepit", type: slot_type.fuel});
this.slot7.show(this.layout[1]);
this.slot7.setItem(0,0,0)


this.bar_bg = ModAPI.UI.util.scaleBitmap(ModAPI.UI.util.bitmap(ModAPI.UI.util.stream_custom("bars/firepit_bg"),1,2,14,10),dip*14,dip*10);
this.bar = ModAPI.UI.createWidget(new android.widget.ImageView(context),dip*123.5,dip*70,(dip*14)*1.5,(dip*10)*1.5,function(){return true;});
this.bar.setImageBitmap(bar_bg)



this.layout[1].addView(this.bar)

this.inventory = ModAPI.UI.Templates.PlayerInventory();
this.layout[0].addView(this.inventory)
this.window = new android.widget.PopupWindow(this.layout[0],Screen.width,Screen.height);
this.window.showAtLocation(context.getWindow().getDecorView(),android.view.Gravity.CENTER,0,0);
})
this.update = function(){
	//print(" test ")
	for(var i in virtual_slots){
	var s = virtual_slots[i]
	if(s.type == "input" && s.uid == "firepit"){
		if(s.id && s.id != 0){
			if(FirepitUPTIME != -1){
				FirepitUPTIME--;
				if(FirepitUPTIME == 0){
					FirepitUPTIME = 200;
					for(var j in FirepitRECIPES){
						if(s.id == FirepitRECIPES[j][0][0] && s.data == FirepitRECIPES[j][0][1]){
							FirepitACTIVE = true;
							if(s.count != 1)
							s.setItem(s.id, s.count-1, s.data)
							else s.setItem(0,0,0)
							FirepitCURRENT.push(FirepitRECIPES[j][0][0], FirepitRECIPES[j][0][1])
							continue;
						}
					}
				}
			}
		}
	}
	if(s.type == "standart" && s.uid == "firepit" && FirepitACTIVE == true){
		for(var j in FirepitRECIPES){
			if(FirepitRECIPES[j][0][0] == FirepitCURRENT[0] && FirepitRECIPES[j][0][1] == FirepitCURRENT[1]){
				if(s.count == 0)
				s.setItem(FirepitRECIPES[j][1][0], 1, FirepitRECIPES[j][1][1])
				else if(s.count > 0)
				s.setItem(FirepitRECIPES[j][1][0], s.count+1, FirepitRECIPES[j][1][1])
				return;
			}
		}
	}
}
}
},
menuButton:function(){
ModAPI.UI.open(function(){
this.layout = ModAPI.UI.createWidget(new android.widget.RelativeLayout(context),dip*0,dip*0,dip*23,dip*23)

this.button = ModAPI.UI.API.Button("TEST",0,0,dip*23,dip*23,function(){
closeAlIImages()
initGUI.menuModList()
return true;},tdip*4)
this.layout.addView(this.button)

window = new android.widget.PopupWindow(this.layout,dip*23,dip*23);
window.showAtLocation(context.getWindow().getDecorView(), android.view.Gravity.RIGHT | android.view.Gravity.TOP, 0, 0);
})
}
};

var closeAlIImages = function(){
   ModAPI.UI.Thread(function(){
      if(window){
/*for(var i in virtual_slots){
var th = virtual_slots[i];
th.selected = false;}*/
         window.dismiss();
         window = null
     }
   })
}

var closeWindow = function(win){
for(var i in virtual_slots){
var th = virtual_slots[i];
th.selected = false;}
   ModAPI.UI.Thread(function(){
      if(win){
         win.dismiss();
         win = null
     }
   })
}

ModAPI.UI.open = function(UI){
   new java.lang.Thread(new java.lang.Runnable({run: function(){
      ModAPI.UI.Thread(UI)
   }})).start();
}

ModAPI.UI.Thread= function(UI){
   context.runOnUiThread(new java.lang.Runnable({run:function(){
      try{
         UI();
      }catch(error){
         Client.log("ERROR", "" + e.message + " line: " + e.lineNumber);
      }
   }}));
}

var Screen = {
   width:0,
   height:0,
   init:function(){
      if(android.os.Build.VERSION.SDK_INT >= 17){
         var vis = context.getWindow().getDecorView().getSystemUiVisibility();
         if((vis && android.view.View.SYSTEM_UI_FLAG_HIDE_NAVIGATION) != 0){
            var display = new android.util.DisplayMetrics();
            context.getWindowManager().getDefaultDisplay().getRealMetrics(display);
            var width = display.widthPixels;
            var height = display.heightPixels;
            if(height > width){
               var tmp = height;
               height = width;
               width = tmp;
            }
            this.width = width;
            this.height = height;
            } else {
              this.width = context.getScreenWidth();
              this.height = context.getScreenHeight();
            }
         } else {
           this.width = context.getScreenWidth();
           this.height = context.getScreenHeight();
         }
     }
}
Screen.init()
var dip = Screen.width/256;
var tdip = dip;
var device = "";
var stage = 0;

(function(){
	Data.read_cache("device","device");
	Data.read_cache("tdip","tdip");
     Data.read_cache("stage","stage");

if(stage == 0){
     ModAPI.UI.API.standart_dialog("Добро пожаловать!", "Приветствуем вас в модифицированном Minecraft Pocket Edition!\nВы установили движок ModEngine и к нему мод TerraFirmaPocket.\nСейчас будет небольшой опрос.", tdip*4, false, ["Продолжить",function(){stage++; showChooseDialog1()}]);
}

})();

var dialog__ = function(){
if((tdip > 4 && tdip < 7)){ 
	var choose = new showChooseDialog();
}
else {
ModAPI.UI.API.standart_dialog("Успешно!", "ModEngine успешно настроен.\nУдачной игры!", tdip*4, false, ["Закрыть",function(){Client.log("Клиент будет перезапущен..."); Client.sleep(1000); Client.restart()}]);
stage = -1
Data.save_cache("device",device);
Data.save_cache("tdip",tdip);
Data.save_cache("stage",stage);
}
} 

function showChooseDialog1(){
	ModAPI.UI.Thread(function(){
		this.dialog = new android.app.AlertDialog.Builder(context); 
		this.dialog.setTitle("Опрос"); 
		this.scroll = new android.widget.ScrollView(context);
		this.layout = new android.widget.LinearLayout(context);
		this.textview = new android.widget.TextView(context); 
		this.textview.setText("Какой у вас устройство?");
		this.textview.setTextSize(dip*4);
		this.dialog.setCancelable(false);
		this.dialog.setPositiveButton("Планшет",function(){
			device = "normal";
			Data.save_cache("device",device);
               Data.save_cache("tdip",tdip);
stage++; dialog__();
		});
		this.dialog.setNeutralButton("Телефон",function(){
			//return true;

			device = "phone";
			Data.save_cache("device",device);
			Data.save_cache("tdip",tdip);
stage++; dialog__();
		});
		this.layout.addView(this.textview);
		this.scroll.addView(this.layout); 
		this.dialog.setView(this.scroll);
		this.dialog.create().show();
		//return this.dialog;
	});
}

function showChooseDialog(){
	ModAPI.UI.Thread(function(){
		this.dialog = new android.app.AlertDialog.Builder(context); 
		this.dialog.setTitle("Опрос"); 
		this.scroll = new android.widget.ScrollView(context);
		this.layout = new android.widget.LinearLayout(context);
		this.textview = new android.widget.TextView(context); 
		this.textview.setText("Мы увидели, что у вас большое разрешение экрана.\nВы уверены, что у вас...\n");
		this.textview.setTextSize(dip*4);
		this.dialog.setCancelable(false);
		this.dialog.setPositiveButton("Планшет",function(){
			device = "normal";
			Data.save_cache("device",device);
               Data.save_cache("tdip",tdip);
stage = -1
Data.save_cache("stage",stage);
ModAPI.UI.API.standart_dialog("Успешно!", "\nModEngine успешно настроен.\nУдачной игры!", tdip*4, false, ["Закрыть",function(){Client.log("Клиент будет перезапущен..."); Client.sleep(1000); Client.restart()}]);
		});
		this.dialog.setNeutralButton("Телефон",function(){
			//return true;
			tdip-=2;
			Math.round(tdip)
			device = "phone";
			Data.save_cache("device",device);
			Data.save_cache("tdip",tdip);
stage = -1
Data.save_cache("stage",stage);
ModAPI.UI.API.standart_dialog("Успешно!", "ModEngine успешно настроен.\nУдачной игры!", tdip*4, false, ["Закрыть",function(){Client.log("Клиент будет перезапущен..."); Client.sleep(1000); Client.restart()}]);
		});
		this.layout.addView(this.textview);
		this.scroll.addView(this.layout); 
		this.dialog.setView(this.scroll);
		this.dialog.create().show();
		//return this.dialog;
	});
}

//if(tdip >= 6){ tdip-=2; Math.round(tdip)}


/*
function useItem(x,y,z,i){
print(i + ":" + Player.getCarriedItemData());
   if(i==280){
   closeAlIImages()
   initGUI.menuButton()
   }
   else if(i==281)
   ModAPI.UI.API.goToUrlAlert("http:/vk.com/mcpe_tfc")
}
*/

ModEngine.writeFileFromByteArray = function(byteArray,path){
var file = new java.io.File(path);
file.getParentFile().mkdirs();
var stream = new java.io.FileOutputStream(file)
stream.write(byteArray);
stream.close();};

ModEngine.getGUIScale = function(){
var file = new java.io.File("/sdcard/games/com.mojang/minecraftpe/options.txt");
var BufferedReader = new java.io.BufferedReader(new java.io.InputStreamReader(new java.io.FileInputStream(file)));
var read, guiscale;
while((read = BufferedReader.readLine()) != null){
if(read.split(":")[0] == "gfx_guiscale") {
guiscale = read.split(":")[1];
break;}}
BufferedReader.close();
return guiscale;};

var ItemGUITextures = {
	"-1:0": ["no_id",0],
	"256:0": ["shovel",2],
	"257:0": ["pickaxe",2],
	"258:0": ["axe",2],
	"259:0": ["flint_and_steel",0],
	"260:0": ["apple",0],
	"261:0": ["bow_standby",0],
	"262:0": ["arrow",0],
	"263:0": ["coal",0],
	"263:1": ["charcoal",0],
	"264:0": ["diamond",0],
	"265:0": ["iron_ingot",0],
	"266:0": ["gold_ingot",0],
	"267:0": ["sword",2],
	"268:0": ["sword",0],
	"269:0": ["shovel",0],
	"270:0": ["pickaxe",0],
	"271:0": ["axe",0],
	"272:0": ["sword",1],
	"273:0": ["shovel",1],
	"274:0": ["pickaxe",1],
	"275:0": ["axe",1],
	"276:0": ["sword",4],
	"277:0": ["shovel",4],
	"278:0": ["pickaxe",4],
	"279:0": ["axe",4],
	"280:0": ["stick",0],
	"281:0": ["bowl",0],
	"282:0": ["mushroom_stew",0],
	"283:0": ["sword",3],
	"284:0": ["shovel",3],
	"285:0": ["pickaxe",3],
	"286:0": ["axe",3],
	"287:0": ["string",0],
	"288:0": ["feather",0],
	"289:0": ["gunpowder",0],
	"290:0": ["hoe",0],
	"291:0": ["hoe",1],
	"292:0": ["hoe",2],
	"293:0": ["hoe",4],
	"294:0": ["hoe",3],
	"295:0": ["seeds_wheat",0],
	"296:0": ["wheat",0],
	"297:0": ["bread",0],
	"298:0": ["helmet",0],
	"299:0": ["chestplate",0],
	"300:0": ["leggings",0],
	"301:0": ["boots",0],
	"302:0": ["helmet",1],
	"303:0": ["chestplate",1],
	"304:0": ["leggings",1],
	"305:0": ["boots",1],
	"306:0": ["helmet",2],
	"307:0": ["chestplate",2],
	"308:0": ["leggings",2],
	"309:0": ["boots",2],
	"310:0": ["helmet",4],
	"311:0": ["chestplate",4],
	"312:0": ["leggings",4],
	"313:0": ["boots",4],
	"314:0": ["helmet",3],
	"315:0": ["chestplate",3],
	"316:0": ["leggings",3],
	"317:0": ["boots",3],
	"318:0": ["flint",0],
	"319:0": ["porkchop_raw",0],
	"320:0": ["porkchop_cooked",0],
	"321:0": ["painting",0],
	"322:0": ["apple_golden",0],
	"323:0": ["sign",0],
	"324:0": ["door_wood",0],
	"325:0": ["bucket",0],
	"325:1": ["bucket",1],
	"325:8": ["bucket",2],
	"325:10": ["bucket",3],
	"328:0": ["minecart_normal",0],
	"329:0": ["saddle",0],
	"330:0": ["door_iron",0],
	"331:0": ["redstone_dust",0],
	"332:0": ["snowball",0],
	"333:0": ["boat",0],
	"334:0": ["leather",0],
	"336:0": ["brick",0],
	"337:0": ["clay_ball",0],
	"338:0": ["reeds",0],
	"339:0": ["paper",0],
	"340:0": ["book_normal",0],
	"341:0": ["slimeball",0],
	"342:0": ["minecart_chest",0],
	"344:0": ["egg",0],
	"345:0": ["compass_item",0],
	"346:0": ["fishing_rod",0],
	"347:0": ["clock_item",0],
	"348:0": ["glowstone_dust",0],
	"349:0": ["fish_raw_cod",0],
	"349:1": ["fish_raw_salmon",0],
	"349:2": ["fish_raw_clown_fish",0],
	"349:3": ["fish_raw_puffer_fish",0],
	"350:0": ["fish_cooked_cod",0],
	"350:1": ["fish_cooked_salmon",0],
	"351:0": ["dye_powder",0],
	"351:1": ["dye_powder",1],
	"351:2": ["dye_powder",2],
	"351:3": ["dye_powder",3],
	"351:4": ["dye_powder",4],
	"351:5": ["dye_powder",5],
	"351:6": ["dye_powder",6],
	"351:7": ["dye_powder",7],
	"351:8": ["dye_powder",8],
	"351:9": ["dye_powder",9],
	"351:10": ["dye_powder",10],
	"351:11": ["dye_powder",11],
	"351:12": ["dye_powder",12],
	"351:13": ["dye_powder",13],
	"351:14": ["dye_powder",14],
	"351:15": ["dye_powder",15],
	"352:0": ["bone",0],
	"353:0": ["sugar",0],
	"354:0": ["cake",0],
	"355:0": ["bed",0],
	"356:0": ["repeater",0],
	"357:0": ["cookie",0],
	"358:0": ["map_filled",0],
	"359:0": ["shears",0],
	"360:0": ["melon",0],
	"361:0": ["seeds_pumpkin",0],
	"362:0": ["seeds_melon",0],
	"363:0": ["beef_raw",0],
	"364:0": ["beef_cooked",0],
	"365:0": ["chicken_raw",0],
	"366:0": ["chicken_cooked",0],
	"367:0": ["rotten_flesh",0],
	"369:0": ["blaze_rod",0],
	"370:0": ["ghast_tear",0],
	"371:0": ["gold_nugget",0],
	"372:0": ["nether_wart",0],
	"373:0":["potion_bottle_drinkable",0],
	"373:1":["potion_bottle_drinkable",0],
	"373:2":["potion_bottle_drinkable",0],
	"373:3":["potion_bottle_drinkable",0],
	"373:4":["potion_bottle_drinkable",0],
	"373:5":["potion_bottle_drinkable",16],
	"373:6":["potion_bottle_drinkable",16],
	"373:7":["potion_bottle_drinkable",14],
	"373:8":["potion_bottle_drinkable",14],
	"373:9":["potion_bottle_drinkable",8],
	"373:10":["potion_bottle_drinkable",8],
	"373:11":["potion_bottle_drinkable",8],
	"373:12":["potion_bottle_drinkable",21],
	"373:13":["potion_bottle_drinkable",21],
	"373:14":["potion_bottle_drinkable",1],
	"373:15":["potion_bottle_drinkable",1],
	"373:16":["potion_bottle_drinkable",1],
	"373:17":["potion_bottle_drinkable",2],
	"373:18":["potion_bottle_drinkable",2],
	"373:19":["potion_bottle_drinkable",13],
	"373:20":["potion_bottle_drinkable",13],
	"373:21":["potion_bottle_drinkable",6],
	"373:22":["potion_bottle_drinkable",6],
	"373:23":["potion_bottle_drinkable",9],
	"373:24":["potion_bottle_drinkable",9],
	"373:25":["potion_bottle_drinkable",19],
	"373:26":["potion_bottle_drinkable",19],
	"373:27":["potion_bottle_drinkable",19],
	"373:28":["potion_bottle_drinkable",10],
	"373:29":["potion_bottle_drinkable",10],
	"373:30":["potion_bottle_drinkable",10],
	"373:31":["potion_bottle_drinkable",5],
	"373:32":["potion_bottle_drinkable",5],
	"373:33":["potion_bottle_drinkable",5],
	"373:34":["potion_bottle_drinkable",7],
	"373:35":["potion_bottle_drinkable",7],
	"374:0": ["potion_bottle_empty",0],
	"375:0": ["spider_eye",0],
	"376:0": ["spider_eye_fermented",0],
	"377:0": ["blaze_powder",0],
	"378:0": ["magma_cream",0],
	"379:0": ["brewing_stand",0],
	"380:0": ["cauldron",0],
	"382:0": ["melon_speckled",0],
	"383:0": ["spawn_egg",0],
	"383:11": ["spawn_egg",1],
	"383:12": ["spawn_egg",2],
	"383:13": ["spawn_egg",3],
	"383:14": ["spawn_egg",4],
	"383:15": ["spawn_egg",14],
	"383:16": ["spawn_egg",5],
	"383:17": ["spawn_egg",15],
	"383:18": ["spawn_egg",24],
	"383:19": ["spawn_egg",18],
	"383:20": ["spawn_egg",0],
	"383:21": ["spawn_egg",0],
	"383:22": ["spawn_egg",16],
	"383:32": ["spawn_egg",12],
	"383:33": ["spawn_egg",6],
	"383:34": ["spawn_egg",9],
	"383:35": ["spawn_egg",11],
	"383:36": ["spawn_egg",13],
	"383:37": ["spawn_egg",10],
	"383:38": ["spawn_egg",7],
	"383:39": ["spawn_egg",8],
	"383:40": ["spawn_egg",22],
	"383:41": ["spawn_egg",19],
	"383:42": ["spawn_egg",20],
	"383:43": ["spawn_egg",21],
	"383:45": ["spawn_egg",17],
	"384:0": ["experience_bottle",0],
	"388:0": ["emerald",0],
	"389:0": ["item_frame",0],
	"390:0": ["flower_pot",0],
	"391:0": ["carrot",0],
	"392:0": ["potato",0],
	"393:0": ["potato_baked",0],
	"394:0": ["potato_poisonous",0],
	"395:0": ["map_empty",0],
	"396:0": ["carrot_golden",0],
	"397:0":["skull_skeleton",0],
	"397:1":["skull_wither",0],
	"397:2":["skull_zombie",0],
	"397:3":["skull_steve",0],
	"397:4":["skull_creeper",0],
	"400:0": ["pumpkin_pie",0],
	"403:0": ["book_enchanted",0],
	"404:0": ["comparator",0],
	"405:0": ["netherbrick",0],
	"406:0": ["quartz",0],
	"407:0": ["minecart_tnt",0],
	"408:0": ["minecart_hopper",0],
	"410:0": ["hopper",0],
	"411:0": ["rabbit",0],
	"412:0": ["rabbit_cooked",0],
	"413:0": ["rabbit_stew",0],
	"414:0": ["rabbit_foot",0],
	"415:0": ["rabbit_hide",0],
	"427:0": ["door_spruce",0],
	"428:0": ["door_birch",0],
	"429:0": ["door_jungle",0],
	"430:0": ["door_acacia",0],
	"431:0": ["door_darkoak",0],
	"438:0":["potion_bottle_splash",0],
	"438:1":["potion_bottle_splash",0],
	"438:2":["potion_bottle_splash",0],
	"438:3":["potion_bottle_splash",0],
	"438:4":["potion_bottle_splash",0],
	"438:5":["potion_bottle_splash",16],
	"438:6":["potion_bottle_splash",16],
	"438:7":["potion_bottle_splash",14],
	"438:8":["potion_bottle_splash",14],
	"438:9":["potion_bottle_splash",8],
	"438:10":["potion_bottle_splash",8],
	"438:11":["potion_bottle_splash",8],
	"438:12":["potion_bottle_splash",21],
	"438:13":["potion_bottle_splash",21],
	"438:14":["potion_bottle_splash",1],
	"438:15":["potion_bottle_splash",1],
	"438:16":["potion_bottle_splash",1],
	"438:17":["potion_bottle_splash",2],
	"438:18":["potion_bottle_splash",2],
	"438:19":["potion_bottle_splash",13],
	"438:20":["potion_bottle_splash",13],
	"438:21":["potion_bottle_splash",6],
	"438:22":["potion_bottle_splash",6],
	"438:23":["potion_bottle_splash",9],
	"438:24":["potion_bottle_splash",9],
	"438:25":["potion_bottle_splash",19],
	"438:26":["potion_bottle_splash",19],
	"438:27":["potion_bottle_splash",19],
	"438:28":["potion_bottle_splash",10],
	"438:29":["potion_bottle_splash",10],
	"438:30":["potion_bottle_splash",10],
	"438:31":["potion_bottle_splash",5],
	"438:32":["potion_bottle_splash",5],
	"438:33":["potion_bottle_splash",5],
	"438:34":["potion_bottle_splash",7],
	"438:35":["potion_bottle_splash",7],
	"439:0": ["camera",0],
	"457:0": ["beetroot",0],
	"458:0": ["seeds_beetroot",0],
	"459:0": ["beetroot_soup",0],
	"460:0": ["fish_raw_salmon",0],
	"461:0": ["fish_raw_clown_fish",0],
	"462:0": ["fish_raw_puffer_fish",0],
	"463:0": ["fish_cooked_salmon",0],
	"466:0": ["apple_golden",0]
};

var BlockGUITextures = {
	"1:0": [["stone",0],31],
	"1:1": [["stone",1],31],
	"1:2": [["stone",2],31],
	"1:3": [["stone",3],31],
	"1:4": [["stone",4],31],
	"1:5": [["stone",5],31],
	"1:6": [["stone",6],31],
	"2:0": [["grass",2],["grass",3],["grass",3],31],
	"3:0": [["dirt",0],31],
	"4:0": [["cobblestone",0],31],
	"5:0": [["planks",0],31],
	"5:1": [["planks",1],31],
	"5:2": [["planks",2],31],
	"5:3": [["planks",3],31],
	"5:4": [["planks",4],31],
	"5:5": [["planks",5],31],
	"6:0": [["sapling",0],1],
	"6:1": [["sapling",1],1],
	"6:2": [["sapling",2],1],
	"6:3": [["sapling",3],1],
	"6:4": [["sapling",4],1],
	"6:5": [["sapling",5],1],
	"7:0": [["bedrock",0],31],
	"8:0": [["flowing_water",0],1],
	"9:0": [["still_water",0],1],
	"10:0": [["flowing_lava",0],1],
	"11:0": [["still_lava",0],1],
	"12:0": [["sand",0],31],
	"12:1": [["sand",1],31],
	"13:0": [["gravel",0],31],
	"14:0": [["gold_ore",0],31],
	"15:0": [["iron_ore",0],31],
	"16:0": [["coal_ore",0],31],
	"17:0": [["log",1],["log",0],["log",0],31],
	"17:1": [["log",3],["log",2],["log",2],31],
	"17:2": [["log",5],["log",4],["log",4],31],
	"17:3": [["log",7],["log",6],["log",6],31],
	"18:0": [["leaves",4],31],
	"18:1": [["leaves",5],31],
	"18:2": [["leaves",6],31],
	"18:3": [["leaves",7],31],
	"19:0": [["sponge",0],31],
	"20:0": [["glass",0],31],
	"21:0": [["lapis_ore",0],31],
	"22:0": [["lapis_block",0],31],
	"23:0": [["furnace",3],["furnace",2],["dispenser_front_horizontal",0],31],
	"24:0": [["sandstone",3],["sandstone",0],["sandstone",0],31],
	"24:1": [["sandstone",3],["sandstone",1],["sandstone",1],31],
	"24:2": [["sandstone",3],["sandstone",2],["sandstone",2],31],
	"25:0": [["jukebox_side",0],31],
	"26:0": [["bed",1],1],
	"27:0": [["rail_golden",0],1],
	"28:0": [["rail_detector",0],1],
	"30:0": [["web",0],1],
	"31:0": [["tallgrass",3],1],
	"31:1": [["tallgrass",3],1],
	"31:2": [["tallgrass",4],1],
	"31:3": [["tallgrass",4],1],
	"32:0": [["tallgrass",1],1],
	"35:0": [["wool",0],31],
	"35:1": [["wool",1],31],
	"35:2": [["wool",2],31],
	"35:3": [["wool",3],31],
	"35:4": [["wool",4],31],
	"35:5": [["wool",5],31],
	"35:6": [["wool",6],31],
	"35:7": [["wool",7],31],
	"35:8": [["wool",8],31],
	"35:9": [["wool",9],31],
	"35:10": [["wool",10],31],
	"35:11": [["wool",11],31],
	"35:12": [["wool",12],31],
	"35:13": [["wool",13],31],
	"35:14": [["wool",14],31],
	"35:15": [["wool",15],31],
	"37:0": [["flower1",0],1],
	"38:0": [["flower2",0],1],
	"38:1": [["flower2",1],1],
	"38:2": [["flower2",2],1],
	"38:3": [["flower2",3],1],
	"38:4": [["flower2",4],1],
	"38:5": [["flower2",5],1],
	"38:6": [["flower2",6],1],
	"38:7": [["flower2",7],1],
	"38:8": [["flower2",8],1],
	"39:0": [["mushroom_brown",0],1],
	"40:0": [["mushroom_red",0],1],
	"41:0": [["gold_block",0],31],
	"42:0": [["iron_block",0],31],
	"43:0": [["stone_slab",0],["stone_slab",1],["stone_slab",1],31],
	"43:1": [["sandstone",3],["sandstone",0],["sandstone",0],31],
	"43:2": [["planks",0],31],
	"43:3": [["cobblestone",0],31],
	"43:4": [["brick",0],31],
	"43:5": [["stonebrick",0],31],
	"43:6": [["quartz_block",0],31],
	"43:7": [["nether_brick",0],31],
	"44:0": [["stone_slab",0],["stone_slab",1],["stone_slab",1],30],
	"44:1": [["sandstone",3],["sandstone",0],["sandstone",0],30],
	"44:2": [["planks",0],30],
	"44:3": [["cobblestone",0],30],
	"44:4": [["brick",0],30],
	"44:5": [["stonebrick",0],30],
	"44:6": [["quartz_block",0],30],
	"44:7": [["nether_brick",0],30],
	"45:0": [["brick",0],31],
	"46:0": [["tnt",1],["tnt",0],["tnt",0],31],
	"47:0": [["planks",0],["bookshelf",0],["bookshelf",0],31],
	"48:0": [["cobblestone_mossy",0],31],
	"49:0": [["obsidian",0],31],
	"50:0": [["torch_on",0],1],
	"51:0": [["fire",0],1],
	"52:0": [["mob_spawner",0],31],
	"53:0": [["planks",0],29],
	"54:0": [["chest_inventory",0],["chest_inventory",1],["chest_inventory",2],31],
	"55:0": [["redstone_dust_line",0],1],
	"56:0": [["diamond_ore",0],31],
	"57:0": [["diamond_block",0],31],
	"58:0": [["crafting_table",0],["crafting_table",1],["crafting_table",2],31],
	"59:0": [["wheat",0],1],
	"59:1": [["wheat",1],1],
	"59:2": [["wheat",2],1],
	"59:3": [["wheat",3],1],
	"59:4": [["wheat",4],1],
	"59:5": [["wheat",5],1],
	"59:6": [["wheat",6],1],
	"59:7": [["wheat",7],1],
	"60:0": [["farmland",1],["dirt",0],["dirt",0],31],
	"61:0": [["furnace",3],["furnace",2],["furnace",0],31],
	"62:0": [["furnace",3],["furnace",2],["furnace",0],31,true],
	"63:0": [["planks",0],1],
	"64:0": [["door",0],1],
	"65:0": [["ladder",0],1],
	"66:0": [["rail_normal",0],1],
	"67:0": [["cobblestone",0],29],
	"68:0": [["planks",0],1],
	"69:0": [["lever",0],1],
	"70:0": [["stone",0],27],
	"71:0": [["door",12],1],
	"72:0": [["planks",0],27],
	"73:0": [["redstone_ore",0],31],
	"74:0": [["redstone_ore",0],31,true],
	"75:0": [["redstone_torch_off",0],1],
	"76:0": [["redstone_torch_on",0],1],
	"77:0": [["stone",0],21],
	"78:0": [["snow",0],26],
	"79:0": [["ice",0],31],
	"80:0": [["snow",0],31],
	"81:0": [["cactus",0],["cactus",1],["cactus",1],31],
	"82:0": [["clay",0],31],
	"83:0": [["reeds",0],1],
	"84:0": [["jukebox_top",0],["jukebox_side",0],["jukebox_side",0],31],
	"85:0": [["planks",0],25],
	"85:1": [["planks",1],25],
	"85:2": [["planks",2],25],
	"85:3": [["planks",3],25],
	"85:4": [["planks",4],25],
	"85:5": [["planks",5],25],
	"86:0": [["pumpkin",0],["pumpkin",1],["pumpkin",2],31],
	"87:0": [["netherrack",0],31],
	"88:0": [["soul_sand",0],31],
	"89:0": [["glowstone",0],31,true],
	"90:0": [["portal",0],31,true],
	"91:0": [["pumpkin",0],["pumpkin",1],["pumpkin",3],31,true],
	"92:0": [["cake_top",0],1],
	"93:0": [["repeater_off",0],1],
	"94:0": [["repeater_on",0],1],
	"95:0": [["stone",0],1],
	"96:0": [["trapdoor",0],22],
	"97:0": [["stone",0],31],
	"97:1": [["cobblestone",0],31],
	"97:2": [["stonebrick",0],31],
	"97:3": [["stonebrick",1],31],
	"97:4": [["stonebrick",2],31],
	"97:5": [["stonebrick",3],31],
	"98:0": [["stonebrick",0],31],
	"98:1": [["stonebrick",1],31],
	"98:2": [["stonebrick",2],31],
	"98:3": [["stonebrick",3],31],
	"99:0": [["mushroom_block",2],31],
	"99:1": [["mushroom_block",0],31],
	"99:2": [["mushroom_block",3],31],
	"100:0": [["mushroom_block",2],31],
	"100:1": [["mushroom_block",1],31],
	"100:2": [["mushroom_block",3],31],
	"101:0": [["iron_bars",0],1],
	"102:0": [["glass",0],1],
	"103:0": [["melon",1],["melon",0],["melon",0],31],
	"104:0": [["pumpkin_stem",0],1],
	"105:0": [["melon_stem",0],1],
	"106:0": [["vine",1],1],
	"107:0": [["planks",0],24],
	"108:0": [["brick",0],29],
	"109:0": [["stonebrick",0],29],
	"110:0": [["mycelium",1],["mycelium",0],["mycelium",0],31],
	"111:0": [["waterlily",1],1],
	"112:0": [["nether_brick",0],31],
	"113:0": [["nether_brick",0],25],
	"114:0": [["nether_brick",0],29],
	"115:0": [["nether_wart",0],1],
	"115:1": [["nether_wart",1],1],
	"115:2": [["nether_wart",2],1],
	"116:0": [["enchanting_table_top",0],["enchanting_table_side",0],["enchanting_table_side",0],18,true],
	"117:0": [["brewing_stand",0],1],
	"118:0": [["cauldron_top",0],["cauldron_side",0],["cauldron_side",0],31],
	"120:0": [["endframee",2],["endframee",1],["endframee",1],19],
	"121:0": [["end_stone",0],31],
	"123:0": [["redstone_lamp_off",0],31],
	"124:0": [["redstone_lamp_on",0],31,true],
	"125:0": [["furnace",3],["furnace",2],["dropper_front_horizontal",0],31],
	"126:0": [["rail_activator",0],1],
	"127:0": [["cocoa",2],1],
	"128:0": [["sandstone",3],["sandstone",0],["sandstone",0],29],
	"129:0": [["emerald_ore",0],31],
	"131:0": [["trip_wire_source",0],1],
	"132:0": [["trip_wire",0],1],
	"133:0": [["emerald_block",0],31],
	"134:0": [["planks",1],29],
	"135:0": [["planks",2],29],
	"136:0": [["planks",3],29],
	"139:0": [["cobblestone",0],20],
	"139:1": [["cobblestone_mossy",0],20],
	"140:0": [["flower_pot",0],1],
	"141:0": [["carrots",0],1],
	"142:0": [["potatoes",0],1],
	"143:0": [["planks",0],21],
	"144:0": [["soul_sand",0],1],
	"145:0": [["anvil_top_damaged_x",0],1],
	"145:1": [["anvil_top_damaged_x",1],1],
	"145:2": [["anvil_top_damaged_x",2],1],
	"146:0": [["chest_inventory",0],["chest_inventory",1],["chest_inventory",2],31],
	"147:0": [["gold_block",0],27],
	"148:0": [["iron_block",0],27],
	"149:0": [["comparator_off",0],1],
	"150:0": [["comparator_on",0],1],
	"151:0": [["daylight_detector_top",0],["daylight_detector_side",0],["daylight_detector_side",0],23],
	"152:0": [["redstone_block",0],31],
	"153:0": [["quartz_ore",0],31],
	"154:0": [["hopper_inside",0],1],
	"155:0": [["quartz_block",1],31],
	"155:1": [["quartz_block",6],["quartz_block",5],["quartz_block",5],31],
	"155:2": [["quartz_block",4],["quartz_block",3],["quartz_block",3],31],
	"156:0": [["quartz_block",2],29],
	"157:0": [["planks",0],31],
	"157:1": [["planks",1],31],
	"157:2": [["planks",2],31],
	"157:3": [["planks",3],31],
	"157:4": [["planks",4],31],
	"157:5": [["planks",5],31],
	"158:0": [["planks",0],30],
	"158:1": [["planks",1],30],
	"158:2": [["planks",2],30],
	"158:3": [["planks",3],30],
	"158:4": [["planks",4],30],
	"158:5": [["planks",5],30],
	"159:0": [["stained_clay",0],31],
	"159:1": [["stained_clay",1],31],
	"159:2": [["stained_clay",2],31],
	"159:3": [["stained_clay",3],31],
	"159:4": [["stained_clay",4],31],
	"159:5": [["stained_clay",5],31],
	"159:6": [["stained_clay",6],31],
	"159:7": [["stained_clay",7],31],
	"159:8": [["stained_clay",8],31],
	"159:9": [["stained_clay",9],31],
	"159:10": [["stained_clay",10],31],
	"159:11": [["stained_clay",11],31],
	"159:12": [["stained_clay",12],31],
	"159:13": [["stained_clay",13],31],
	"159:14": [["stained_clay",14],31],
	"159:15": [["stained_clay",15],31],
	"161:0": [["leaves2",2],31],
	"161:1": [["leaves2",3],31],
	"162:0": [["log2",1],["log2",0],["log2",0],31],
	"162:1": [["log2",3],["log2",2],["log2",2],31],
	"163:0": [["planks",4],29],
	"164:0": [["planks",5],29],
	"165:0": [["slime_block",0],31],
	"167:0": [["iron_trapdoor",0],22],
	"170:0": [["hayblock",0],["hayblock",1],["hayblock",1],31],
	"171:0": [["wool",0],27],
	"171:1": [["wool",1],27],
	"171:2": [["wool",2],27],
	"171:3": [["wool",3],27],
	"171:4": [["wool",4],27],
	"171:5": [["wool",5],27],
	"171:6": [["wool",6],27],
	"171:7": [["wool",7],27],
	"171:8": [["wool",8],27],
	"171:9": [["wool",9],27],
	"171:10": [["wool",10],27],
	"171:11": [["wool",11],27],
	"171:12": [["wool",12],27],
	"171:13": [["wool",13],27],
	"171:14": [["wool",14],27],
	"171:15": [["wool",15],27],
	"172:0": [["hardened_clay",0],31],
	"173:0": [["coal_block",0],31],
	"174:0": [["ice_packed",0],31],
	"175:0": [["sunflower_additional",0],1],
	"175:1": [["double_plant_top",1],1],
	"175:2": [["double_plant_carried",0],1],
	"175:3": [["double_plant_carried",1],1],
	"175:4": [["double_plant_top",4],1],
	"175:5": [["double_plant_top",5],1],
	"175:6": [["double_plant_top",0],1],
	"178:0": [["daylight_detector_inverted_top",0],["daylight_detector_side",0],["daylight_detector_side",0],23],
	"179:0": [["redsandstone",3],["redsandstone",0],["redsandstone",0],31],
	"179:1": [["redsandstone",3],["redsandstone",1],["redsandstone",1],31],
	"179:2": [["redsandstone",3],["redsandstone",2],["redsandstone",2],31],
	"180:0": [["redsandstone",3],["redsandstone",0],["redsandstone",0],29],
	"181:0": [["redsandstone",3],["redsandstone",0],["redsandstone",0],31],
	"182:0": [["redsandstone",3],["redsandstone",0],["redsandstone",0],30],
	"183:0": [["planks",1],24],
	"184:0": [["planks",2],24],
	"185:0": [["planks",3],24],
	"186:0": [["planks",5],24],
	"187:0": [["planks",4],24],
	"193:0": [["door",2],1],
	"194:0": [["door",4],1],
	"195:0": [["door",6],1],
	"196:0": [["door",8],1],
	"197:0": [["door",10],1],
	"198:0": [["grass_path",0],["grass_path",1],["grass_path",1],17],
	"199:0": [["itemframe_background",0],1],
	"243:0": [["dirt",1],["dirt",2],["dirt",2],31],
	"244:0": [["beetroot",0],1],
	"245:0": [["stonecutter",2],["stonecutter",1],["stonecutter",0],31],
	"246:0": [["glowing_obsidian",0],31,true],
	"247:0": [["reactor_core",0],31],
	"247:1": [["reactor_core",1],31],
	"247:2": [["reactor_core",2],31],
	"248:0": [["missing_tile",0],31],
	"249:0": [["missing_tile",0],31],
	"255:0": [["missing_tile",0],31],
};



var GUIBars = [];
var standart_bar_image = ModAPI.UI.util.scaleBitmap(ModAPI.UI.util.bitmap(ModAPI.UI.util.stream("spritesheet"),73,36,22,16),22,16);
var standart_bar_image_bg = ModAPI.UI.util.scaleBitmap(ModAPI.UI.util.bitmap(ModAPI.UI.util.stream("spritesheet"),73,20,22,16),22,16);
var standart_bar_image_cache = [];



function standart_progress(x,y,width,height)
{
	this.x = x;
	this.y = y;
	this.width = width || 22;
	this.height = height || 16;
	this.bar = undefined;
	this.progress = 0;
	this.isShowing = false;
	
	this.show = function(view)
	{
		if(this.isShowing) return;
		
		this.bar = ModAPI.UI.createWidget(new android.widget.ImageView(context),x,y,width,height);
		this.bar.setImageBitmap(standart_bar_image_bg);
		view.addView(this.bar);
		
		this.isShowing = true;
	}
	
	this.setProgress = function(progress)
	{
		if(progress < 0) progress = 0;
		if(progress > 1) progress = 1;
		
		this.progress = progress;
		var bar = this;
		var w = 22;
		var h = 16;
		
		var bg = standart_bar_image_cache[parseInt(progress*22)];
		if(bg) return ModAPI.UI.Thread(function()
		{
			if(!bar.isShowing) bar.show();
			bar.bar.setImageBitmap(bg);
		});
		
		var bitmap = android.graphics.Bitmap.createBitmap(w,h,android.graphics.Bitmap.Config.ARGB_8888);
		var rep = standart_bar_image;
		var b = standart_bar_image_bg;
		
		for(var x = 0; x < w; x++)
		{
			for(var y = 0; y < h; y++)
			{
				if(x < w*this.progress) bitmap.setPixel(x,y,rep.getPixel(x,y)); else bitmap.setPixel(x,y,b.getPixel(x,y));
			}
		}
		
		bitmap = android.graphics.Bitmap.createScaledBitmap(bitmap,w*8,h*8,false);
		standart_bar_image_cache[parseInt(progress*22)] = bitmap;
		
		ModAPI.UI.Thread(function()
		{
			if(!bar.isShowing) bar.show();
			bar.bar.setImageBitmap(bitmap);
		});
	}
	
	this.getProgress = function()
	{
		return this.progress;
	}
}


function ProgressBar(view,x,y,width,height)
{
	var bar = new standart_progress(x,y,width,height);
	bar.show(view);
	GUIBars[GUIBars.length] = bar;
	return bar;
}

/*

function addCustomProgressBarToGUI(x,y,width,height)
{
	var bar = new GUIProgressBar(x,y,width,height);
	GUIThread(function(){bar.show();});
	GUIBars[GUIBars.length] = bar;
	return bar;
}
*/































/*
var GUIVerticalBars = [];
var ImageGUIVerticalProgressBar = scaleGUIImage("spritesheet2",34,0,7,28);
var ImageGUIVerticalProgressBarBG = scaleGUIImage("spritesheet2",25,0,7,28);
var ImageGUIVerticalProgressBarCache = [];


function GUIVerticalProgressBar(x,y,width,height)
{
	this.x = x;
	this.y = y;
	this.width = width || 7;
	this.height = height || 28;
	this.bar = undefined;
	this.progress = 0;
	this.isShowing = false;
	
	this.show = function()
	{
		if(this.isShowing) return;
		
		this.bar = new android.widget.ImageView(context);
		this.bar.setImageBitmap(android.graphics.Bitmap.createScaledBitmap(ImageGUIVerticalProgressBarBG,this.width*8,this.height*8,false));
		setGUIViewSize(this.bar,this.width*GUISize,this.height*GUISize);
		CurrentGUILayout.addView(this.bar);
		setGUIViewPosition(this.bar,this.x*GUISize,this.y*GUISize);
		
		this.isShowing = true;
	}
	
	this.setProgress = function(progress)
	{
		if(progress < 0) progress = 0;
		if(progress > 1) progress = 1;
		
		this.progress = progress;
		var bar = this;
		var w = 7;
		var h = 28;
		
		var bg = ImageGUIVerticalProgressBarCache[parseInt(progress*28)];
		if(bg) return GUIThread(function()
		{
			if(!bar.isShowing) bar.show();
			bar.bar.setImageBitmap(bg);
		});
		
		var bitmap = android.graphics.Bitmap.createBitmap(w,h,android.graphics.Bitmap.Config.ARGB_8888);
		var rep = ImageGUIVerticalProgressBar;
		var b = ImageGUIVerticalProgressBarBG;
		
		for(var x = 0; x < w; x++)
		{
			for(var y = 0; y < h; y++)
			{
				if(y < h*this.progress) bitmap.setPixel(x,y,rep.getPixel(x,y)); else bitmap.setPixel(x,y,b.getPixel(x,y));
			}
		}
		
		bitmap = android.graphics.Bitmap.createScaledBitmap(bitmap,w*8,h*8,false);
		ImageGUIVerticalProgressBarCache[parseInt(progress*28)] = bitmap;
		
		GUIThread(function()
		{
			if(!bar.isShowing) bar.show();
			bar.bar.setImageBitmap(bitmap);
		});
	}
	
	this.getProgress = function()
	{
		return this.progress;
	}
}


function addVerticalProgressBarToGUI(x,y,width,height)
{
	var bar = new GUIVerticalProgressBar(x,y,width,height);
	bar.show();
	GUIVerticalBars[GUIVerticalBars.length] = bar;
	return bar;
}



function addCustomVerticalProgressBarToGUI(x,y,width,height)
{
	var bar = new GUIVerticalProgressBar(x,y,width,height);
	GUIThread(function(){bar.show();});
	GUIVerticalBars[GUIVerticalBars.length] = bar;
	return bar;
}


*/


var isLoaded = false;


ModEngine.callHook("onSelectLevel", function(){
	script_list = net.zhuoweizhang.mcpelauncher.ScriptManager.scripts;
	scriptable_object = org.mozilla.javascript.ScriptableObject;
	ModEngine.addGlobalMethod = function(uid, method){
		if(!scriptable_object.hasProperty(scope, uid)){
			scriptable_object.putProperty(scope, uid, method)
		}
	}
	
	for(var i = 0; i < script_list.size(); i++){
		scope = script_list.get(i).scope;
		script = script_list.get(i);
		if(!isLoaded){
			ModEngine.addHook("addingMethods")
			ModEngine.addGlobalMethod("ModEngine", ModEngine);
			ModEngine.addGlobalMethod("ModAPI", ModAPI);
			ModEngine.addGlobalMethod("Client", Client);
			ModEngine.addGlobalMethod("World", World);
			ModEngine.addGlobalMethod("FileAPI", FileAPI);
		}
	}
});

// if(getTile(getPlayerX(),getPlayerY()-1,getPlayerZ(),8))
// {
	// water+=0.05
// }
// if(getTile(getPlayerX(),getPlayerY()-1,getPlayerZ(),9))
// {
	// water+=0.05
// }

	//World.generateOre([[{id:89, data:0, type:"normal", maxY:50}]])
	//World.generateTerrainUnity([[{id:89, data:0}],[{id:1, data:1}]])
	//World.generateTerrainDouble([[{id:1, data:0, id2:5, data2:0}]])
	
/*ModEngine.callHook("everyTick", function(){
	World.generateTerrainMassive(function(x, y, z){
		var rand = random(1, 15);
		if(rand == 5){
			var id = 34;
			var id2 = 29;
			World.setTile(x, y + 1, z, id, 0);
			World.setTile(x, y + 2, z, id, 0);
			World.setTile(x, y + 3, z, id, 0);
			World.setTile(x, y + 4, z, id, 0);
			var rnd = random(1, 5);
			if(rnd == 1)
				World.setTile(x, y + 5, z, id, 0);
			else if(rnd == 2){
				World.setTile(x + 1, y + 5, z, id, 0);
				World.setTile(x + 2, y + 6,z, id, 0);
				World.setTile(x - 1, y + 6,z, id, 0);
				World.setTile(x, y + 6, z, id, 0);
			}
			else if(rnd == 3){
				World.setTile(x, y + 5, z + 1, id, 0);
				World.setTile(x, y + 6, z + 2, id, 0);
				World.setTile(x, y + 6, z - 1, id, 0);
				World.setTile(x, y + 6, z, id, 0);
			}
			else if(rnd == 4){
				World.setTile(x, y + 6, z, id, 0);
				World.setTile(x + 1, y + 5, z, id, 0);
				World.setTile(x + 2, y + 6, z, id, 0);
				World.setTile(x - 1, y + 6, z, id, 0);
				World.setTile(x - 2, y + 6, z, id2, 0);
				World.setTile(x - 1, y + 7, z, id2, 0);
				World.setTile(x + 3, y + 6, z, id2, 0);
				World.setTile(x + 2, y + 7, z, id2, 0);
			}
			else if(rnd == 5){
				World.setTile(x, y + 6, z, id, 0);
				World.setTile(x, y + 5, z + 1, id, 0);
				World.setTile(x, y + 6, z + 2, id, 0);
				World.setTile(x, y + 6, z - 1, id, 0);
				World.setTile(x, y + 6, z - 2, id2, 0);
				World.setTile(x, y + 7, z - 1, id2, 0);
				World.setTile(x, y + 6, z + 3, id2, 0);
				World.setTile(x, y + 7, z + 2, id2, 0);
			}
		}
	})
});
*/

function leaveGame(){
	closeAlIImages()
	FileAPI.media.audio.stop();
	ModEngine.addHook("afterPlayerLeave");
}

try{ModAPI.defineBlock(29,{name: "Firepit", textures: [["firepit", 0], ["firepit", 0], ["no_tx", 0], ["no_tx", 0], ["no_tx", 0], ["no_tx", 0], ["stone", 0], ["stone", 0], ["stone", 0], ["stone", 0], ["stone", 0], ["stone", 0]], stack: 32});
Block.setShape(29, 0,0,0,1,1/100,1);
Block.setRenderLayer(29, 3);
}catch(e){}


/*Block.defineBlock(255,"lol",[["firepit",0],["firepit",0],["no_tx",0],["no_tx",0],["no_tx",0],["no_tx",0]],0,false,0);
Player.addItemCreativeInv(255, 1, 0);*/

var Mechanisms = {
};

Mechanisms.Firepit = function(id){
this.base = MechanismBase; 
this.base(); 
this.id = id; 
this.timer = 4;
this.tick = function(block){
this.timer--;
if(this.timer == 0){ this.timer = 4;
Level.addParticle(ParticleType.flame,block.x+0.2+(Math.random()-0.2),block.y+0.1,block.z+0.2+(Math.random()-0.2),0,0.05,0); 
}
}
}
/*
if(gui.update) gui.update();
initGUI.menuModList
*/
var MechanismTypes = [new Mechanisms.Firepit(29)]; 
var WaitToLoadMechanism;

function MechanismBase()
{
this.coords = []; 
this.id = -1; 

this.tick = function(block){} 

this.tickAllTypeBlocks = function(){
for(var i in this.coords){
var block = this.coords[i];
var tile = getTile(block.x,block.y,block.z);
if(tile == this.id){
this.tick(block);
}else{
for(var p = 0; p < 50; p++)  Level.addParticle(ParticleType.happyVillager,block.x+Math.random(),block.y+Math.random(),block.z+Math.random(),0,0,0); // ?????????? ???? ??????

this.coords.splice(i,1);
i--;
}
}
}
}


function tickAllMechanisms()
{
for(var i in MechanismTypes)
{
var type = MechanismTypes[i];
type.tickAllTypeBlocks();
}
}


function getMechanism(x,y,z){
for(var i in MechanismTypes){
var type = MechanismTypes[i];
for(var l in type.coords){
var block = type.coords[l];
if(block.x == x && block.y == y && block.z == z) return block;
}
}
}


function tryLoadMechanism(x,y,z) {
var tile = getTile(x,y,z);
if(getMechanism(x,y,z)) return block;
for(var i in MechanismTypes){
var type = MechanismTypes[i];
if(tile == type.id){
type.coords.push({x:x,y:y,z:z}); 
for(var p = 0; p < 50; p++) Level.addParticle(ParticleType.redstone,x+Math.random(),y+Math.random(),z+Math.random(),0,0,0,2); 
}
}
}


function getSideCoords(x,y,z,side)
{
if(side == 0) y--;
if(side == 1) y++;
if(side == 2) z--;
if(side == 3) z++;
if(side == 4) x--;
if(side == 5) x++;
return {x:x,y:y,z:z};
}





ModEngine.callHook("everyTick", function(){
tickAllMechanisms(); 
if(WaitToLoadMechanism)
{
var block = WaitToLoadMechanism;
tryLoadMechanism(block.x,block.y,block.z);
WaitToLoadMechanism = null;
}
});

var FirepitGUI;

ModEngine.callHook("useItem", function(x,y,z,item,b,side)
{
for(var i in MechanismTypes)
{
var type = MechanismTypes[i];
if(item == type.id) WaitToLoadMechanism = getSideCoords(x,y,z,side); 
if(b == type.id){
FirepitGUI = new initGUI.menuModList;
ModEngine.callHook("everyTick", function(){
FirepitGUI.update();
})
}
}
})

var terrain_atlas = net.zhuoweizhang.mcpelauncher.texture.tga.TGALoader.load(ModPE.openInputStreamFromTexturePack("images/terrain-atlas.tga"), false);

var terrain_meta = eval(new java.lang.String(ModPE.getBytesFromTexturePack("images/terrain.meta"))+"");
var terrain_meta_mapped = terrain_meta.map(function(element){
	return element.name;
});

function getGUIBlockIcon(id,data,width,height)
{
	var tex = getBlockTextureByID(id,data);
	if(!tex) return NO_ID;
	var t = tex[0];
	var l = tex[1];
	var r = tex[2];
	var render = 31;
	if(tex.length == 2) render = tex[1];
	else if(tex.length == 4 || tex.length == 5) render = tex[3];
	var isLight = false;
	if(tex.length == 3) isLight = tex[2];
	else if(tex.length == 5) isLight = tex[4]; 
	if(!Array.isArray(l)) l = t;
	if(!Array.isArray(r)) r = l;
	
	
	var top = getGUIBlockSideBitmap(t[0],t[1]);
	var left = getGUIBlockSideBitmap(l[0],l[1]);
	var right = getGUIBlockSideBitmap(r[0],r[1]);
	
	if(!top || !left || !right) return NO_ID;
	var temp = android.graphics.Bitmap.createBitmap(51,57,android.graphics.Bitmap.Config.ARGB_8888);
	
	if(render == 31) temp = getGUICubeBitmap(left,right,top,temp,isLight);
	else if(render == 1) temp = top, width = 64, height = 64;
	else if(render == 30) temp = getGUICubeBitmap(left,right,top,temp,isLight,16);
	else if(render == 29) temp = getGUIStairBitmap(left,right,top,temp,isLight);
	else if(render == 28) temp = getGUICubeBitmap(left,right,top,temp,isLight,30);
	else if(render == 27) temp = getGUICubeBitmap(left,right,top,temp,isLight,3);
	else if(render == 26) temp = getGUICubeBitmap(left,right,top,temp,isLight,4);
	else if(render == 25) temp = getGUIFenceBitmap(left,right,top,temp,isLight);
	else if(render == 24) temp = getGUIFenceGateBitmap(left,right,top,temp,isLight);
	else if(render == 23) temp = getGUICubeBitmap(left,right,top,temp,isLight,12);
	else if(render == 22) temp = getGUICubeBitmap(left,right,top,temp,isLight,6);
	else if(render == 21) temp = getGUIButtonBitmap(left,right,top,temp,isLight);
	else if(render == 20) temp = getGUIWallBitmap(left,right,top,temp,isLight);
	else if(render == 19) temp = getGUICubeBitmap(left,right,top,temp,isLight,26);
	else if(render == 18) temp = getGUICubeBitmap(left,right,top,temp,isLight,24);
	else if(render == 17) temp = getGUICubeBitmap(left,right,top,temp,isLight,30);
	
	
	return android.graphics.Bitmap.createScaledBitmap(temp,width,height,false);
}






function getGUICubeBitmap(left,right,top,temp,isLight,height)
{
	if(!height) height = 32;
	
	var matrix = new android.graphics.Matrix();
	var canvas = new android.graphics.Canvas(temp);
	var paint = new android.graphics.Paint();
	
	left = android.graphics.Bitmap.createBitmap(left,0,32-height,32,height);
	left = android.graphics.Bitmap.createScaledBitmap(left,25,height,false);
	var mats = [0,0,25,0,25,height,0,height];
	var matd = [0,0,25,12,25,12+height,0,height];
	matrix.setPolyToPoly(mats,0,matd,0,4);
	left = android.graphics.Bitmap.createBitmap(left,0,0,left.getWidth(),left.getHeight(),matrix,false);
	
	right = android.graphics.Bitmap.createBitmap(right,0,32-height,32,height);
	right = android.graphics.Bitmap.createScaledBitmap(right,26,height,false);
	var mats = [0,0,26,0,26,height,0,height];
	var matd = [0,12,26,0,26,height,0,12+height];
	matrix.setPolyToPoly(mats,0,matd,0,4);
	right = android.graphics.Bitmap.createBitmap(right,0,0,right.getWidth(),right.getHeight(),matrix,false);
	
	var mats = [0,0,32,0,32,32,0,32];
	var matd = [0,14,25,2,51,14,25,27];
	matrix.setPolyToPoly(mats,0,matd,0,4);
	top = android.graphics.Bitmap.createBitmap(top,0,0,top.getWidth(),top.getHeight(),matrix,false);
	
	canvas.drawBitmap(top,0,33-height,paint);
	
	if(!isLight) paint.setColorFilter(new android.graphics.PorterDuffColorFilter(android.graphics.Color.rgb(255-75,255-75,255-75),android.graphics.PorterDuff.Mode.MULTIPLY));
	canvas.drawBitmap(left,0,temp.getHeight()-left.getHeight(),paint);
	
	if(!isLight) paint.setColorFilter(new android.graphics.PorterDuffColorFilter(android.graphics.Color.rgb(255-140,255-140,255-140),android.graphics.PorterDuff.Mode.MULTIPLY));
	canvas.drawBitmap(right,25,temp.getHeight()-right.getHeight(),paint);
	
	return temp;
}












function getGUIStairBitmap(left,right,top,temp,isLight)
{
    var createLeft = function(left)
    {
        left = android.graphics.Bitmap.createScaledBitmap(left,25,32,false);
        var src = [0,0,25,0,25,32,0,32];
        var dst = [0,0,25,12,25,44,0,32];
        var matrix = new android.graphics.Matrix();
        matrix.setPolyToPoly(src,0,dst,0,4);
        return android.graphics.Bitmap.createBitmap(left,0,0,left.getWidth(),left.getHeight(),matrix,false);
    };
    
    var createRight = function(right)
    {
        right = android.graphics.Bitmap.createScaledBitmap(right,26,32,false);
        var first = android.graphics.Bitmap.createBitmap(right,0,0,26,16);
        var src = [0,0,26,0,26,16,0,16];
        var dst = [0,13,26,0,26,16,0,29];
        var matrix = new android.graphics.Matrix();
        matrix.setPolyToPoly(src,0,dst,0,4);
        first = android.graphics.Bitmap.createBitmap(first,0,0,first.getWidth(),first.getHeight(),matrix,false);
        
        var second = android.graphics.Bitmap.createBitmap(right,0,16,26,16);
        second = android.graphics.Bitmap.createBitmap(second,0,0,second.getWidth(),second.getHeight(),matrix,false);
        
        return [first,second];
    };
    
    var createTop = function(top)
    {
        top = android.graphics.Bitmap.createScaledBitmap(top,32,32,false);
        var first = android.graphics.Bitmap.createBitmap(top,0,0,32,16);
        var src = [0,0,32,0,32,16,0,16];
        var dst = [0,13.5,26,0,38.25,6.5,12.75,19.5];
        var matrix = new android.graphics.Matrix();
        matrix.setPolyToPoly(src,0,dst,0,4);
        first = android.graphics.Bitmap.createBitmap(first,0,0,first.getWidth(),first.getHeight(),matrix,false);
        
        var second = android.graphics.Bitmap.createBitmap(top,0,16,32,16);
        second = android.graphics.Bitmap.createBitmap(second,0,0,second.getWidth(),second.getHeight(),matrix,false);
        
        return [first,second];
    };
    
    left = createLeft(left);
    right = createRight(right);
    top = createTop(top);
    
    var canvas = new android.graphics.Canvas(temp);
    var paint = new android.graphics.Paint();
    if(!isLight) paint.setColorFilter(new android.graphics.PorterDuffColorFilter(android.graphics.Color.rgb(255-75,255-75,255-75),android.graphics.PorterDuff.Mode.MULTIPLY));
    canvas.drawBitmap(left,0,temp.getHeight()-left.getHeight(),paint);
    if(!isLight) paint.setColorFilter(new android.graphics.PorterDuffColorFilter(android.graphics.Color.rgb(255-140,255-140,255-140),android.graphics.PorterDuff.Mode.MULTIPLY));
    canvas.drawBitmap(right[0],13,6,paint);
    canvas.drawBitmap(right[1],25,temp.getHeight()-right[1].getHeight(),paint);
    canvas.drawBitmap(top[0],0,0,null);
    canvas.drawBitmap(top[1],13,22,null);
    
    return temp;
};









function getGUIFenceBitmap(left,right,top,temp,isLight)
{
	var createVert = function(left,right,top)
	{
		left = android.graphics.Bitmap.createBitmap(left,12,0,8,32);
		left = android.graphics.Bitmap.createScaledBitmap(left,6,32,false);
		var src = [0,0,6,0,6,32,0,32];
		var dst = [0,0,6,3,6,35,0,32];
		var matrix = new android.graphics.Matrix();
		matrix.setPolyToPoly(src,0,dst,0,4);
		left = android.graphics.Bitmap.createBitmap(left,0,0,left.getWidth(),left.getHeight(),matrix,false);
		
		right = android.graphics.Bitmap.createBitmap(right,12,0,8,32);
		right = android.graphics.Bitmap.createScaledBitmap(right,6,32,false);
		src = [0,0,6,0,6,32,0,32];
		dst = [0,3,6,0,6,32,0,35];
		matrix.setPolyToPoly(src,0,dst,0,4);
		right = android.graphics.Bitmap.createBitmap(right,0,0,right.getWidth(),right.getHeight(),matrix,false);
		
		top = android.graphics.Bitmap.createBitmap(top,12,12,8,8);
		top = android.graphics.Bitmap.createScaledBitmap(top,6,6,false);
		src = [0,0,6,0,6,6,0,5];
		dst = [0,3,6.5,0,12,3,3,6.5];
		matrix.setPolyToPoly(src,0,dst,0,4);
		top = android.graphics.Bitmap.createBitmap(top,0,0,top.getWidth(),top.getHeight(),matrix,false);
		
		var temp = android.graphics.Bitmap.createBitmap(12,38,android.graphics.Bitmap.Config.ARGB_8888);
		var canvas = new android.graphics.Canvas(temp);
		var paint = android.graphics.Paint();
		if(!isLight) paint.setColorFilter(new android.graphics.PorterDuffColorFilter(android.graphics.Color.rgb(255-75,255-75,255-75),android.graphics.PorterDuff.Mode.MULTIPLY));
		canvas.drawBitmap(left,0,3,paint);
		if(!isLight) paint.setColorFilter(new android.graphics.PorterDuffColorFilter(android.graphics.Color.rgb(255-140,255-140,255-140),android.graphics.PorterDuff.Mode.MULTIPLY));
		canvas.drawBitmap(right,6,3,paint);
		canvas.drawBitmap(top,0,0,null);
		
		return temp;
	};
	
	var createHorz = function(left,right,top,type)
	{
		left = android.graphics.Bitmap.createBitmap(left,0,2+type*16,32,4);
		var src = [0,0,32,0,32,4,0,4];
		var dst = [0,0,32,16,32,20,0,4];
		var matrix = new android.graphics.Matrix();
		matrix.setPolyToPoly(src,0,dst,0,4);
		left = android.graphics.Bitmap.createBitmap(left,0,0,left.getWidth(),left.getHeight(),matrix,false);
		
		right = android.graphics.Bitmap.createBitmap(right,15,2+type*16,3,4);
		src = [0,0,3,0,3,4,0,4];
		dst = [0,2,3,0,3,4,0,6];
		matrix.setPolyToPoly(src,0,dst,0,4);
		right = android.graphics.Bitmap.createBitmap(right,0,0,right.getWidth(),right.getHeight(),matrix,false);
		
		top = android.graphics.Bitmap.createBitmap(top,15,0,2,32);
		top = android.graphics.Bitmap.createScaledBitmap(top,2,35,false);
		src = [0,0,2,0,2,35,0,35];
		dst = [0,2,5,0,35,15,32,17];
		matrix.setPolyToPoly(src,0,dst,0,4);
		top = android.graphics.Bitmap.createBitmap(top,0,0,top.getWidth(),top.getHeight(),matrix,false);
		
		var temp = android.graphics.Bitmap.createBitmap(35,22,android.graphics.Bitmap.Config.ARGB_8888);
		var canvas = new android.graphics.Canvas(temp);
		var paint = android.graphics.Paint();
		if(!isLight) paint.setColorFilter(new android.graphics.PorterDuffColorFilter(android.graphics.Color.rgb(255-75,255-75,255-75),android.graphics.PorterDuff.Mode.MULTIPLY));
		canvas.drawBitmap(left,0,2,p);
		if(!isLight) paint.setColorFilter(new android.graphics.PorterDuffColorFilter(android.graphics.Color.rgb(255-140,255-140,255-140),android.graphics.PorterDuff.Mode.MULTIPLY));
		canvas.drawBitmap(right,32,16,p);
		canvas.drawBitmap(top,0,1,null);
		
		return temp;
	};
	
	var vert = createVert(left,right,top);
	var horz1 = createHorz(left,right,top,0);
	var horz2 = createHorz(left,right,top,1);
	
	var canvas = new android.graphics.Canvas(temp);
	canvas.drawBitmap(vert,10,5,null);
	canvas.drawBitmap(vert,temp.getWidth()-vert.getWidth()-10,temp.getHeight()-vert.getHeight()-5,null);
	canvas.drawBitmap(horz1,8,6,null);
	canvas.drawBitmap(horz2,8,21,null);
	
	return temp;
};






















function getGUIFenceGateBitmap(left,right,top,temp,isLight)
{
	var createVert = function(left,right,top,type)
	{
		left = android.graphics.Bitmap.createBitmap(left,type*28,0,4,22);
		var src = [0,0,4,0,4,22,0,22];
		var dst = [0,0,4,3,4,25,0,22];
		var matrix = new android.graphics.Matrix();
		matrix.setPolyToPoly(src,0,dst,0,4);
		left = android.graphics.Bitmap.createBitmap(left,0,0,left.getWidth(),left.getHeight(),matrix,false);
		right = android.graphics.Bitmap.createBitmap(right,14,0,4,22);
		var src = [0,0,4,0,4,22,0,22];
		var dst = [0,3,4,0,4,22,0,25];
		var matrix = new android.graphics.Matrix();
		matrix.setPolyToPoly(src,0,dst,0,4);
		right = android.graphics.Bitmap.createBitmap(right,0,0,right.getWidth(),right.getHeight(),matrix,false);
		top = android.graphics.Bitmap.createBitmap(top,type*28,14,4,4);
		var src = [0,0,4,0,4,4,0,4];
		var dst = [0,3,4,0,8,3,4,6];
		var matrix = new android.graphics.Matrix();
		matrix.setPolyToPoly(src,0,dst,0,4);
		top = android.graphics.Bitmap.createBitmap(top,0,0,top.getWidth(),top.getHeight(),matrix,false);
		var temp = android.graphics.Bitmap.createBitmap(8,28,android.graphics.Bitmap.Config.ARGB_8888);
		var canvas = new android.graphics.Canvas(temp);
		var paint = new android.graphics.Paint();
		if(!isLight) paint.setColorFilter(new android.graphics.PorterDuffColorFilter(android.graphics.Color.rgb(255-75,255-75,255-75),android.graphics.PorterDuff.Mode.MULTIPLY));
		canvas.drawBitmap(left,0,3,paint);
		if(!isLight) paint.setColorFilter(new android.graphics.PorterDuffColorFilter(android.graphics.Color.rgb(255-140,255-140,255-140),android.graphics.PorterDuff.Mode.MULTIPLY));
		canvas.drawBitmap(right,4,3,paint);
		canvas.drawBitmap(top,0,0,null);
		
		return temp;
	};
	
	var createHoriz = function(left,right,top)
	{
		left = android.graphics.Bitmap.createBitmap(left,0,2,32,14);
		var src = [0,0,32,0,32,14,0,14];
		var dst = [0,0,26,13,26,27,0,14];
		var matrix = new android.graphics.Matrix();
		matrix.setPolyToPoly(src,0,dst,0,4);
		left = android.graphics.Bitmap.createBitmap(left,0,0,left.getWidth(),left.getHeight(),matrix,false);
		right = android.graphics.Bitmap.createBitmap(right,14,0,4,14);
		var src = [0,0,4,0,4,14,0,14];
		var dst = [3,0,4,0,4,14,0,17];
		var matrix = new android.graphics.Matrix();
		matrix.setPolyToPoly(src,0,dst,0,4);
		right = android.graphics.Bitmap.createBitmap(right,0,0,right.getWidth(),right.getHeight(),matrix,false);
		top = android.graphics.Bitmap.createBitmap(top,14,0,4,32);
		var src = [0,0,4,0,4,32,0,32];
		var dst = [0,3,4,0,30,13,26,16];
		var matrix = new android.graphics.Matrix();
		matrix.setPolyToPoly(src,0,dst,0,4);
		top = android.graphics.Bitmap.createBitmap(top,0,0,top.getWidth(),top.getHeight(),matrix,false);
		var temp = android.graphics.Bitmap.createBitmap(30,30,android.graphics.Bitmap.Config.ARGB_8888);
		var canvas = new android.graphics.Canvas(temp);
		var paint = new android.graphics.Paint();
		if(!isLight){
			paint.setColorFilter(new android.graphics.PorterDuffColorFilter(android.graphics.Color.rgb(255-75,255-75,255-75),android.graphics.PorterDuff.Mode.MULTIPLY));
		}
		canvas.drawBitmap(left,0,3,paint);
		if(!isLight){
			paint.setColorFilter(new android.graphics.PorterDuffColorFilter(android.graphics.Color.rgb(255-140,255-140,255-140),android.graphics.PorterDuff.Mode.MULTIPLY));
		}
		canvas.drawBitmap(right,26,16,paint);
		canvas.drawBitmap(top,0,0,null);
		
		return temp;
	};
	
	var vert1 = createVert(left,right,top,0);
	var vert2 = createVert(left,right,top,1);
	var horz = createHoriz(left,right,top);
	var canvas = new android.graphics.Canvas(temp);
	canvas.drawBitmap(vert1,13,5,null);
	canvas.drawBitmap(vert2,35,15,null);
	canvas.drawBitmap(horz,13,8,null);
	
	return temp;
};








function getGUIWallBitmap(left,right,top,temp,isLight)
{
	var createVert = function(left,right,top)
	{
		left = android.graphics.Bitmap.createBitmap(left,8,0,16,32);
		left = android.graphics.Bitmap.createScaledBitmap(left,13,22,false);
		var src = [0,0,13,0,13,32,0,32];
		var dst = [0,0,13,6,13,50,0,42];
		var matrix = new android.graphics.Matrix();
		matrix.setPolyToPoly(src,0,dst,0,4);
		left = android.graphics.Bitmap.createBitmap(left,0,0,left.getWidth(),left.getHeight(),matrix,false);
		right = android.graphics.Bitmap.createScaledBitmap(right,13,32,false);
		src = [0,0,13,0,13,32,0,32];
		dst = [0,6,13,0,13,32,0,38];
		matrix.setPolyToPoly(src,0,dst,0,4);
		right = android.graphics.Bitmap.createBitmap(right,0,0,right.getWidth(),right.getHeight(),matrix,false);
		top = android.graphics.Bitmap.createBitmap(top,8,8,16,16);
		top = android.graphics.Bitmap.createScaledBitmap(top,13,13,false);
		src = [0,0,13,0,13,13,0,13];
		dst = [0,6.5,13.5,0,26,6.5,13.5,13];
		matrix.setPolyToPoly(src,0,dst,0,4);
		top = android.graphics.Bitmap.createBitmap(top,0,0,top.getWidth(),top.getHeight(),matrix,false);
		var temp = android.graphics.Bitmap.createBitmap(26,44,android.graphics.Bitmap.Config.ARGB_8888);
		var canvas = new android.graphics.Canvas(temp);
		var paint = new android.graphics.Paint();
		if(!isLight){
			paint.setColorFilter(new android.graphics.PorterDuffColorFilter(android.graphics.Color.rgb(255-75,255-75,255-75),android.graphics.PorterDuff.Mode.MULTIPLY));
		}
		canvas.drawBitmap(left,0,6,paint);
		if(!isLight){ 
			paint.setColorFilter(new android.graphics.PorterDuffColorFilter(android.graphics.Color.rgb(255-140,255-140,255-140),android.graphics.PorterDuff.Mode.MULTIPLY));
		}
		canvas.drawBitmap(right,13,6,paint);
		canvas.drawBitmap(top,0,0,null);
		return temp;
	};
	
	var createHorzRight = function(right)
	{
		right = android.graphics.Bitmap.createBitmap(right,8,8,16,24);
		right = android.graphics.Bitmap.createScaledBitmap(right,11,24,false);
		var src = [0,0,11,0,11,24,0,24];
		var dst = [0,6,11,0,11,24,0,30];
		var matrix = new android.graphics.Matrix();
		matrix.setPolyToPoly(src,0,dst,0,4);
		right = android.graphics.Bitmap.createBitmap(right,0,0,right.getWidth(),right.getHeight(),matrix,false);
		return right;
	};
	
	var createHorzTop = function(top)
	{
		top = android.graphics.Bitmap.createBitmap(top,8,0,16,32);
		var src = [0,32,0,0,16,0,16,32];
		var dst = [0,6.5,11,0,21,5,10,11.5];
		var matrix = new android.graphics.Matrix();
		matrix.setPolyToPoly(src,0,dst,0,4);
		top = android.graphics.Bitmap.createBitmap(top,0,0,top.getWidth(),top.getHeight(),matrix,false);
		return top;
	};
	
	var vert = createVert(left,right,top);
	var rightHorz = createHorzRight(right);
	var topHorz = createHorzTop(top);
	var canvas = new android.graphics.Canvas(temp);
	var paint = new android.graphics.Paint();
	canvas.drawBitmap(vert,temp.getWidth()-vert.getWidth(),0,null);
	if(!isLight){
		paint.setColorFilter(new android.graphics.PorterDuffColorFilter(android.graphics.Color.rgb(255-140,255-140,255-140),android.graphics.PorterDuff.Mode.MULTIPLY));
	}
	canvas.drawBitmap(rightHorz,26,18,paint);
	canvas.drawBitmap(topHorz,16,13,null);
	canvas.drawBitmap(vert,0,temp.getHeight()-vert.getHeight(),null);
	return temp;
};



















function getGUIBlockSideBitmap(texture,index)
{
	var map = terrain_meta[terrain_meta_mapped.indexOf(texture)];
	if(!map) return;
	var uvs = map.uvs[index];
	if(!uvs) return;
	
	var x = uvs[0];
	var y = uvs[1];
	var width = uvs[2]-x;
	var height = uvs[3]-y;
		
	return android.graphics.Bitmap.createScaledBitmap(android.graphics.Bitmap.createBitmap(terrain_atlas,x,y,width,height),32,32,false);
}


function getBlockTextureByID(id,data)
{
	var texArr = BlockGUITextures[id+":"+data];
	if(texArr) return texArr;
}


var items_meta = eval(new java.lang.String(ModPE.getBytesFromTexturePack("images/items.meta")) + "");
var items_meta_mapped = items_meta.map(function(element)
{
	return element.name;
});


function getItemTextureByID(id,data)
{
	var texture = ItemGUITextures[id+":"+data];
	if(texture) return texture;
}

var NO_ID = 0;

(function(){
	ModEngine.onLoad();
	ModEngine.onLoad_getAllInformationAboutItems();
})();


var font = new android.graphics.Typeface.createFromFile("/sdcard/games/com.mojang/mod_engine/res/font.ttf");

/////////////////////MOD_ENGINE/////////////////////


var Loader = {
	mod_path: new java.io.File(FileAPI.getFullPath("games/com.mojang/mod_engine/mods")),
	mods: [],
	getScriptsByPath: function(path){
		var mods = path.listFiles();
		for(var i in mods){
			if(!mods[i].isDirectory())
				this.mods.push(mods[i])
			else this.getScriptsByPath(mods[i])
		}
	},
	load: function(){
		this.getScriptsByPath(this.mod_path)
		for(var i in this.mods){
			try {
				var mod = FileAPI.readFile(this.mods[i])
				mod = new java.lang.String(mod)
				eval("" + mod)
			} catch(e){
				Client.log("ERROR", "MOD PATH: " + this.mods[i] +"\n" + e.message + " line: " + e.lineNumber);
				continue;
			}
		}
	},
};

ModAPI.destroyTree = function(){
	var is = this;
	this.woodIds = [];
	this.leavesIds = [18,161];
	this.addWoodID = function(id, data, drop){
		is.woodIds.push([id, data, drop]);
	}
	this.addLeavesID = function(id, data, drop){
		this.leavesIds.push([id, data, drop]);
	}
	this.destroyLeaves = function(x,y,z){
		for (var xx = -1; xx <= 1; xx++) {
		for (var yy = 0; yy <= 1; yy++) {
		for (var zz = -1; zz <= 1; zz++) {
			if(getTile(x+xx,y+yy,z+zz) == 18){
			setTile(x,y,z,0);
			this.destroyLeaves(x+xx,y+yy,z+zz)
		}}
		}
		}
	}
	this.destroyBlock = function(x,y,z){
		for(var i in is.woodIds){
			for(var j in is.leavesIds){
			if(getTile(x,y,z) == is.woodIds[i][0] && Level.getData(x,y,z) == is.woodIds[i][1]){
				this.id = is.woodIds[i][0];
				this.data = is.woodIds[i][1];
				this.drop = is.woodIds[i][2];
				this.leaves = is.leavesIds[i]
				if(getTile(x,y+2,z) == this.id && Level.getData(x,y+1,z) == this.data){
					Level.playSoundEnt(getPlayerEnt(), 'dig.wood', 1000, 1000);
					FileAPI.media.audio.play(FileAPI.getFullPath("games/com.mojang/mod_engine/res/sound/tree_fall.ogg"),false)
				} else Level.playSoundEnt(getPlayerEnt(), 'dig.wood', 1000, 1000);
				for (var xx = -1; xx <= 1; xx++) {
				for (var yy = 0; yy <= 1; yy++) {
				for (var zz = -1; zz <= 1; zz++) {
					if(getTile(x+xx,y+yy,z+zz) == this.id && Level.getData(x+xx,y+yy,z+zz) == this.data){
						preventDefault();
						setTile(x,y,z, 0)
						Level.dropItem(x + .5, y +(.1), z + .5, 0, this.drop, 1, 0);
						this.destroyBlock(x+xx,y+yy,z+zz)
					}
					if(getTile(x+xx,y+yy,z+zz) == this.leaves){
						setTile(x+xx,y+yy,z+zz,0)
						this.destroyLeaves(x+xx,y+yy,z+zz)
					}
				}
				}
				}
			}}
		}
	}
}

var __destroyTreeAPI = new ModAPI.destroyTree;


Loader.load()

//SHOW LOG WITH ERRS;

var converted_logs = "";


function search_errors(){
if(Logs[0]){
	var cache__ = [];
	for(var i in Logs){
		if(!Array.isArray(Logs[i]))
			cache__.push('</font>[<font color="#008000">' + 'MOD' + ']</font><font color="000000"> ' + Logs[i]+ '<br>')
		else {
			if(Logs[i][0] == "ERROR")
				cache__.push('</font>[<font color="#AA0000">' + Logs[i][0] + ']</font><font color="000000"> ' + Logs[i][1]+ '<br>')
			if(Logs[i][0] == "WARNING")
				cache__.push('</font>[<font color="#FFA500">' + Logs[i][0] + ']</font><font color="000000"> ' + Logs[i][1]+ '<br>')
			if(Logs[i][0] == "MOD")
				cache__.push('</font>[<font color="#008000">' + Logs[i][0] + ']</font><font color="000000"> ' + Logs[i][1]+ '<br>')
			if(Logs[i][0] == "")
				cache__.push('</font>[<font color="#008000">' + 'MOD' + ']</font><font color="000000"> ' + Logs[i][1]+ '<br>')
		}
	}
	converted_logs = cache__;
}
}

	search_errors()
	
if(converted_logs != ""){
	converted_logs = converted_logs.join("")
	Client.alert("ModEngine LOG", "<font face='calibri'>" + converted_logs)
}
	
try{
	function deathHook(a,v){
		if(Entity.getEntityTypeId(v) == 63){
			Player.setThirst(20)
			thirst_points_time = 36200;
		}
	}
}catch(e){}



if(ModEngine.mods.terrafirmapocket){
	
ModEngine.callHook("destroyBlock", function(x,y,z){
	__destroyTreeAPI.destroyBlock(x,y,z)
});

var TreeCapitatorDROPS_STANDART = [
		[17, 0, 709], [17, 4, 709], [17, 8, 709], [17, 12, 709], 
		[17, 1, 712], [17, 5, 712], [17, 9, 712], [17, 13, 712], 
		[17, 2, 703], [17, 6, 709], [17, 10, 709], [17, 14, 709], 
		[17, 3, 717], [17, 7, 717], [17, 11, 717], [17, 15, 717], 
		[162, 0, 700], [162, 2, 700], [162, 4, 700], [162, 6, 700], 
		[162, 1, 710], [162, 3, 710], [162, 5, 710], [162, 7, 710], 
	]
	
	for(var i in TreeCapitatorDROPS_STANDART){
		__destroyTreeAPI.addWoodID(TreeCapitatorDROPS_STANDART[i][0], TreeCapitatorDROPS_STANDART[i][1], TreeCapitatorDROPS_STANDART[i][2])
	}
}
