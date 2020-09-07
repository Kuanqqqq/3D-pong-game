
// global stuff
var canvas;
var gl=null;

// shaders
var program1;	// color shader

var currentlyPressedKeys = {};	// array of key perssed by the user
var viewMatrix;
var projMatrix;
var mouseLeftDown = false;
var lastMouseX = 0;
var lastMouseY = 0;

// window size
var windowWidth=512, windowHeight=512;

// geometries
var pad_left = null;
var pad_right = null;
var ball = null;

// pad constants
const pad_width = 10;
const pad_height= 70;
const pad_depth = 20;
const pad_speed = 3;

const left_player_up = 87;
const left_player_down = 83;
const left_player_left = 65;
const left_player_right = 68;
const right_player_up = 38;
const right_player_down = 40;
const right_player_left = 37;
const right_player_right = 39;

const table_size = 20;
const max_x_rot = 20.0 * 3.14159/180;
var   delta_x_rot = 0.1 * 3.14159/180;
var   curr_x_rot = 0;

var frontPolygon = null;
var unitCubeGeo = null;

// top view = 0, left player view = 1
var  current_view = 0;

function IndexedGeometry(geo)
{
	this.vertexBuffer = gl.createBuffer();
	this.vertexBuffer.itemSize = 3;	// x,y,z
	this.vertexBuffer.numItems = geo.vertexPositions.length/3;
	gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, geo.vertexPositions, gl.STATIC_DRAW);

	this.normalBuffer = gl.createBuffer();
	this.normalBuffer.itemSize = 3;	// x,y,z
	this.normalBuffer.numItems = geo.vertexNormals.length/3;
	gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, geo.vertexNormals, gl.STATIC_DRAW);
	
	this.indexBuffer = gl.createBuffer();
	this.indexBuffer.itemSize = 3; // a,b,c
	this.indexBuffer.numItems = geo.indices.length/3;
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geo.indices, gl.STATIC_DRAW);
}

IndexedGeometry.prototype = 
{
    constructor: IndexedGeometry,
	
	render: function(program, model, normal, color, specular)
	{
		gl.useProgram(program);
		gl.enableVertexAttribArray(0);	
		gl.enableVertexAttribArray(1);	
		gl.uniformMatrix4fv(program.pMatrixUniform,  false, projMatrix);
		
		let table_transform = mat4.create();
		mat4.translate(table_transform,table_transform, vec3.fromValues(windowWidth/2, windowHeight/2,0));
		mat4.rotateX(table_transform,table_transform, curr_x_rot);
		mat4.translate(table_transform,table_transform, vec3.fromValues(-windowWidth/2, -windowHeight/2,0));

		let m = mat4.create();
		mat4.copy(m, viewMatrix);
		mat4.multiply(m,m,table_transform);
		mat4.multiply(m,m,model);
		
		let n = mat4.create();
		mat4.copy(n, viewMatrix);
		mat4.multiply(n,n,table_transform);
		mat4.multiply(n,n,normal);
		

		gl.uniformMatrix4fv(program.mvMatrixUniform, false, m);
		gl.uniformMatrix4fv(program.uNormalMatrix, false, n);

		gl.uniform4fv(program.inColor, vec4.fromValues(color[0], color[1], color[2], color[3]) );
		gl.uniform1f(program.specular_coeff, specular);
		
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
		gl.vertexAttribPointer(0, this.vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);
		
		gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
		gl.vertexAttribPointer(1, this.normalBuffer.itemSize, gl.FLOAT, false, 0, 0);

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
		gl.drawElements(gl.TRIANGLES, this.indexBuffer.numItems*this.indexBuffer.itemSize, gl.UNSIGNED_SHORT, 0);		
		gl.disableVertexAttribArray(0);	
		gl.disableVertexAttribArray(1);	
		gl.useProgram(null);
	},

}
	
function padObject(side)
{
	this.gpu_geometry = unitCubeGeo;

	// pad positions
	if (side == 0)	// left
		this.padx = table_size + pad_width * 0.5;
	else
		this.padx = windowWidth - 1.0 - pad_width * 0.5 - table_size;
	this.id = side;
	this.pady = (windowHeight - 1.0)/ 2.0;
	this.score = 0;
}

padObject.prototype = 
{
    constructor: padObject,

	render: function(program)
	{
		let modelMatrix = mat4.create();
		mat4.translate(modelMatrix, modelMatrix, vec3.fromValues(this.padx, this.pady, 0.0));
		mat4.scale(modelMatrix,modelMatrix,vec3.fromValues(pad_width, pad_height, pad_depth));
		let normalMatrix= mat4.create();
		this.gpu_geometry.render(program, modelMatrix, normalMatrix, [1,1,1,1], 0.1);
	},
	
	move: function(up, down, left, right)
	{
		if (currentlyPressedKeys[up]==true || currentlyPressedKeys[left]==true)
		{
			this.pady-=pad_speed;
			if (this.pady - pad_height * 0.5 < table_size)
				this.pady = table_size + pad_height * 0.5;
			//console.log(this.pady);
		}	
		if (currentlyPressedKeys[down]==true || currentlyPressedKeys[right]==true)
		{
			this.pady+=pad_speed;
			if (this.pady + pad_height *0.5 > windowHeight-1-table_size)
				this.pady = windowHeight - 1 - table_size - pad_height * 0.5;
			//console.log(this.pady);
		}	
		
	},
	
	update: function()
	{
		if (this.id==0)
		{
			this.move(left_player_down,left_player_up,left_player_left, left_player_right);
		}
		else
		{
			this.move(right_player_down,right_player_up,right_player_left, right_player_right);
		}
	},
	
	getx: function()
	{
		return this.padx;
	},
	
	gety: function()
	{
		return this.pady;
	}
}

	
function ballObject()
{
	this.gpu_geometry = new IndexedGeometry(sphere(10,10,1));
	this.x = windowWidth/2;
	this.y = windowHeight/2;
	this.radius = 15;
	this.dy = Math.random() > 0.5 ? -1:1;
	this.dx = (Math.random() > 0.5) ? -1:1;
	let norm = Math.sqrt(this.dx*this.dx + this.dy*this.dy);
	this.dy /= norm;
	this.dx /= norm;
	this.speed = 3.0;
}

ballObject.prototype = 
{
    constructor: ballObject,

	restart: function()
	{
		do
		{
			this.dy = 2 * Math.random() - 1;
		} while (Math.abs(this.dy) < 0.2);
		this.dx = (Math.random() > 0.5) ? -1:1;
		let norm = Math.sqrt(this.dx*this.dx + this.dy*this.dy);
		this.dy /= norm;
		this.dx /= norm;
		this.x = windowWidth/2;
		this.y = windowHeight/2;
		this.speed = 3.0;
		document.getElementById('scores').innerHTML = pad_left.score + "-"+pad_right.score;
	},
	
	render: function(program)
	{
		let modelMatrix = mat4.create();
		mat4.translate(modelMatrix, modelMatrix, vec3.fromValues(this.x, this.y, 0.0));
		mat4.scale(modelMatrix,modelMatrix,vec3.fromValues(this.radius, this.radius, this.radius));
		let normalMatrix= mat4.create();
		this.gpu_geometry.render(program, modelMatrix, normalMatrix, [0.1,0.25,0.95,1], 1.0);
	},
	
	update: function()
	{
		this.speed += 0.001;
		// reaching right part
		if (this.x + this.radius + this.dx*this.speed >= pad_right.getx() - pad_width/2)
		{
			let y = this.y + this.dy*this.speed;
			if (pad_right.gety() - pad_height/2 <= y && y <= pad_right.gety() + pad_height/2)
			{
				this.x = pad_right.getx()-pad_width/2-this.radius;
				this.dx = -this.dx;			
			}
			else
			{
				pad_left.score += 1;
				this.restart();
				return;
			}
		}
		else if (this.x - this.radius + this.dx*this.speed <= pad_left.getx() + pad_width/2)
		{
			let y = this.y + this.dy*this.speed;
			if (pad_left.gety() - pad_height/2 <= y && y <= pad_left.gety() + pad_height/2)
			{
				this.x = pad_left.getx()+pad_width/2+this.radius;
				this.dx = -this.dx;			
			}
			else
			{
				pad_right.score += 1;
				this.restart();
				return;
			}
		}
		else
			this.x += this.dx*this.speed;
		
		if (this.y + this.dy*this.speed -this.radius < table_size)
		{
			this.y = table_size + this.radius;
			this.dy = -this.dy;
		}
		else if (this.y + this.dy*this.speed + this.radius > windowHeight-1-table_size)
		{
			this.y = windowHeight-1-table_size-this.radius;
			this.dy = -this.dy;
		}
		else
			this.y += this.dy*this.speed;
		
		//console.log(this.x, this.y);
	},
	
}
	
// convert mouse coordinates to canvas coordinates
function toClient(x,y)
{
	var rect = canvas.getBoundingClientRect();
	x = x - rect.left;
    y = rect.bottom - 1 - y;	
	return [x,y];
}


function handleMouseDown(event) 
{
	var res = toClient(event.clientX, event.clientY);
	lastMouseX = res[0];
	lastMouseY = res[1];

	if (event.button == 0)
	{
		mouseLeftDown = true;
		//renderScene();
		current_view += 1;
		if (current_view==2) current_view =0;
		if (current_view == 0)	// top view
			mat4.lookAt(viewMatrix, vec3.fromValues(windowWidth/2,windowHeight/2,600), vec3.fromValues(windowWidth/2,windowHeight/2,-1), vec3.fromValues(0,1,0));
		else
			mat4.lookAt(viewMatrix, vec3.fromValues(windowWidth+450,windowHeight/2,250), vec3.fromValues(windowWidth/2,windowHeight/2,0), vec3.fromValues(-1,0,0));
	}
		
	return false;
}

function handleMouseUp(event) 
{
	var res = toClient(event.clientX, event.clientY);
	lastMouseX = res[0];
	lastMouseY = res[1];

	if (event.button == 0)
		mouseLeftDown = false;
	//renderScene();
}
		
function handleMouseMove(event) 
{
	//console.log("mouse move");
	var res  = toClient(event.clientX, event.clientY);
	var deltaX = res[0] - lastMouseX;
	var deltaY = lastMouseY - res[1];
	lastMouseX = res[0];
	lastMouseY = res[1];

	if (mouseLeftDown==true)
	{
		
	}
	
	//renderScene();
}	


function onWindowResize(w, h) 
{
	windowWidth = 512;
	windowHeight = 512;
    gl.viewport( 0, 0, windowWidth, windowHeight );
	
	let maximum = windowWidth;
	if (windowHeight > maximum)
		maximum = windowHeight;
	
	mat4.perspective(projMatrix, 3.14159 / 3, 1, 1, 1000);
	//projMatrix = ortho(0.0, windowWidth, 0.0, windowHeight, -maximum, maximum );
}


// initializing webGL 1.0
function initGL()
{

    canvas = document.getElementById( "gl-canvas" );
	try 
	{
		gl = canvas.getContext("experimental-webgl", {alpha: true});
	} catch (e) 
	{
	}
    if ( !gl ) 
	{ 
		alert( "Sorry, webGL 1.0 isn't available in your browser" ); 
		return false;
	}
	projMatrix = mat4.create();
	viewMatrix = mat4.create();
	onWindowResize(512,512);

    gl.clearColor( 0.0, 0.0, 0.0, 1.0 );
    gl.enable(gl.DEPTH_TEST);
	gl.enable(gl.CULL_FACE);
	
	mat4.lookAt(viewMatrix, vec3.fromValues(windowWidth/2,windowHeight/2,600), vec3.fromValues(windowWidth/2,windowHeight/2,-1), vec3.fromValues(0,1,0));

	// definying key down/up handlers
	window.onkeydown = handleKeyDown;
	window.onkeyup   = handleKeyUp;	
	// resize callback
	window.addEventListener('resize',    onWindowResize,    false);
	// mouse events
	canvas.addEventListener("mousedown", handleMouseDown,   false);
	canvas.addEventListener("mouseup",   handleMouseUp,     false);
	canvas.addEventListener("mousemove", handleMouseMove,   false);
		
	return true;

}

function getShaderFromShaderFile(gl, shaderType, str) 
{
	var shader;
	if (shaderType == "fragment") 
		shader = gl.createShader(gl.FRAGMENT_SHADER);
	else if (shaderType == "vertex") 
		shader = gl.createShader(gl.VERTEX_SHADER);
	else 
		return null;
	gl.shaderSource(shader, str);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) 
	{
		alert(gl.getShaderInfoLog(shader));
		return null;
	}
	return shader;

}

function initPairShaders(v, f)
{
	var fragmentShader = getShaderFromShaderFile(gl, "fragment", f);
	var vertexShader   = getShaderFromShaderFile(gl, "vertex", v);
	
	// create a program to hold both main shaders
	var p  = gl.createProgram();

	// attach the shaders  into a program
	gl.attachShader(p, vertexShader);
	gl.attachShader(p, fragmentShader);

	// linking
	gl.linkProgram(p);

	if (!gl.getProgramParameter(p, gl.LINK_STATUS)) 
	{
		alert("Could not initialise shaders");
		return null;
	}

	// set this program as default!
	gl.useProgram(p);	
	return p;
}

// load the vertex and fragment shaders
function initShaders() 
{	
	program1 = initPairShaders(vertex_shader1,fragment_shader1);
	if (program1)
	{
		// getting the location of attributes (vertex position, color and model view matrix)
		program1.vertexPositionAttribute = gl.getAttribLocation(program1, "vPosition");
		program1.normalPositionAttribute = gl.getAttribLocation(program1, "vNormal");
		program1.mvMatrixUniform = gl.getUniformLocation(program1, "uMVMatrix");
		program1.uNormalMatrix = gl.getUniformLocation(program1, "uNormalMatrix");
		program1.pMatrixUniform = gl.getUniformLocation(program1, "uProjMatrix");
		program1.inColor = gl.getUniformLocation(program1, "inColor");
		program1.specular_coeff = gl.getUniformLocation(program1, "specular_coeff");
	}

	gl.useProgram(null);
	return (program1);
}

// called when the user press a key
function handleKeyDown(event) 
{
	currentlyPressedKeys[event.keyCode] = true;
	if (event.keyCode==82)
	{
		if (pad_left && pad_right && ball)
		{
			pad_left.score = pad_right.score = 0;
			ball.restart();
		}
	}
	console.log(event.keyCode + ' pressed');
}

// called when the user release a key
function handleKeyUp(event) 
{
	currentlyPressedKeys[event.keyCode] = false;
}

// create all geometries
function createGeometry()
{
	unitCubeGeo = new IndexedGeometry(cube(1.0));
	pad_left = new padObject(0);
	pad_right = new padObject(1);
	frontPolygon = new IndexedGeometry(quad(1.0));
	ball = new ballObject();
}


// initializing all
function initWebGL() 
{
	if (initGL())
	{
		initShaders();
		createGeometry();

		// render the scene the first time... it will create a set of call via animation
		renderScene();
	}
	else
		return false;
	return true;
}

function drawTable()
{
	let n = mat4.create();
	let s = 0.1;// SPECULAR coefficient
	let m = mat4.create();
	mat4.translate(m, m, vec3.fromValues(windowWidth/2, table_size/2, 0.0));
	mat4.scale(m, m, vec3.fromValues(windowWidth, table_size, 0.5*pad_depth));
	unitCubeGeo.render(program1,m, n, [0.5,0.25,0,1],s);
	
	m = mat4.create();
	mat4.translate(m, m, vec3.fromValues(windowWidth/2, windowHeight-1-table_size/2, 0.0));
	mat4.scale(m, m, vec3.fromValues(windowWidth, table_size, 0.5*pad_depth));	
	unitCubeGeo.render(program1, m,n, [0.5,0.25,0,1],s);
	
	m = mat4.create();
	mat4.translate(m, m, vec3.fromValues(table_size/2, windowHeight/2, 0.0));
	mat4.scale(m, m, vec3.fromValues(table_size, windowHeight-2*table_size, 0.5*pad_depth));	
	unitCubeGeo.render(program1, m, n, [0.5,0.25,0,1],s);
	
	m = mat4.create();
	mat4.translate(m, m, vec3.fromValues(windowWidth-1-table_size/2, windowHeight/2, 0.0));
	mat4.scale(m, m, vec3.fromValues( table_size, windowHeight-2*table_size, 0.5*pad_depth));	
	unitCubeGeo.render(program1, m, n, [0.5,0.25,0,1],s);
}

// render one frame, and do a request for animation
var renderScene = function() 
{
	// clear the frame buffer and z buffer
	gl.viewport( 0, 0, windowWidth, windowHeight );
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	
	curr_x_rot +=delta_x_rot;
	if (curr_x_rot + delta_x_rot > max_x_rot)
	{
		curr_x_rot = max_x_rot;
		delta_x_rot = -delta_x_rot;
	}
	else if (curr_x_rot + delta_x_rot < -max_x_rot)
	{
		curr_x_rot = -max_x_rot;
		delta_x_rot = -delta_x_rot;
	}
	else
		curr_x_rot += delta_x_rot;
	
	drawTable();
	
	if (pad_left != null)
	{
		pad_left.update();
		pad_left.render(program1);
	}
	if (pad_right != null)
	{
		pad_right.update();
		pad_right.render(program1);
	}
	
	if (ball != null)
	{
		ball.update();
		ball.render(program1);
	}
		
	let modelMatrix = mat4.create();
	mat4.translate(modelMatrix, modelMatrix, vec3.fromValues(windowWidth/2.0, windowHeight/2.0, 0.1));
	mat4.scale(modelMatrix, modelMatrix, vec3.fromValues(4, windowHeight, 1));
	
	let normalMatrix = mat4.create();
	frontPolygon.render(program1, modelMatrix, normalMatrix, [1,1,1,1], 0.0);
	
	modelMatrix = mat4.create();
	mat4.translate(modelMatrix, modelMatrix, vec3.fromValues(windowWidth/2.0, windowHeight/2.0, -ball.radius));
	mat4.scale(modelMatrix, modelMatrix, vec3.fromValues(windowWidth, windowHeight, 1));
	frontPolygon.render(program1, modelMatrix, normalMatrix, [0,0.7,0.7,1], 0.1);
	
	setTimeout(requestAnimationFrame(renderScene), 1000/ 60);

}

		