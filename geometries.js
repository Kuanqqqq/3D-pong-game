function cube(side) 
{
   var s = (side || 1)/2;
   var v = [-s,-s,s, s,-s,s, s,s,s, -s,-s,s, s,s,s, -s,s,s, // front
	-s,-s,-s, -s,s,-s, s,s,-s, -s,-s,-s, s,s,-s, s,-s,-s,	// back
	-s,s,-s, -s,s,s, s,s,s, -s,s,-s, s,s,s, s,s,-s,			// top
	-s,-s,-s, s,-s,-s, s,-s,s, -s,-s,-s, s,-s,s, -s,-s,s,	// button
	s,-s,-s, s,s,-s, s,s,s, s,-s,-s, s,s,s, s,-s,s,			// right
	-s,-s,-s, -s,-s,s, -s,s,s, -s,-s,-s, -s,s,s, -s,s,-s	// left
   ];
   var normals = [0,0,1, 0,0,1, 0,0,1, 0,0,1, 0,0,1, 0,0,1,	// FRONT
	0,0,-1, 0,0,-1, 0,0,-1, 0,0,-1, 0,0,-1, 0,0,-1,			// back
	0,1,0, 0,1,0, 0,1,0, 0,1,0, 0,1,0, 0,1,0,				// top
	0,-1,0, 0,-1,0, 0,-1,0, 0,-1,0, 0,-1,0, 0,-1,0, 		// button
	1,0,0, 1,0,0, 1,0,0, 1,0,0, 1,0,0, 1,0,0, 				// right
	-1,0,0, -1,0,0, -1,0,0, -1,0,0, -1,0,0, -1,0,0			// left
	];
   var indices = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,
   17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35
   ];
   
   var ret = {};
   ret.vertexPositions = new Float32Array(v);
   ret.vertexNormals = new Float32Array(normals);
   ret.indices = new Uint16Array(indices);
   return ret;
}


function quad(side) 
{
   var s = (side || 1)/2;
   var vertices = [-s, -s, 0, +s, -s, 0, +s, +s, 0, -s, +s, 0];
   var normals = [0,0,1,0,0,1,0,0,1,0,0,1,];
   var indices = [0,1,2,0,2,3];
   var ret = {};
   ret.vertexPositions = new Float32Array(vertices);
   ret.vertexNormals = new Float32Array(normals);
   ret.indices = new Uint16Array(indices);
   return ret;
}


function sphere(rings, segments, radius)
{
	var vertexPositionData = [];
	var normalData = [];
	var indices = [];

	for (var ringsNumber = 0; ringsNumber <= rings; ringsNumber++) 
	{
		var theta = ringsNumber * Math.PI / rings;
		var sinTheta = Math.sin(theta);
		var cosTheta = Math.cos(theta);

		for (var segmentsNumber = 0; segmentsNumber <= segments; segmentsNumber++) 
		{
			var phi = segmentsNumber * 2 * Math.PI / segments;
			var sinPhi = Math.sin(phi);
			var cosPhi = Math.cos(phi);
			
			var x = cosPhi * sinTheta;
			var y = cosTheta;
			var z = sinPhi * sinTheta;

			normalData.push(x);
			normalData.push(y);
			normalData.push(z);

			vertexPositionData.push(radius * x);
			vertexPositionData.push(radius * y);
			vertexPositionData.push(radius * z);
		}
	}
	
	for (var ringsNumber = 0; ringsNumber < rings; ringsNumber++) 
	{
		for (var segmentsNumber = 0; segmentsNumber < segments; segmentsNumber++) 
		{
			var first = (ringsNumber * (segments + 1)) + segmentsNumber;
			var second = first + segments + 1;

			indices.push(first);
			indices.push(second);
			indices.push(first + 1);

			indices.push(second);
			indices.push(second + 1);
			indices.push(first + 1);
		}
	}

	var ret = {};
	ret.vertexPositions = new Float32Array(vertexPositionData);
	ret.vertexNormals = new Float32Array(normalData);
	ret.indices = new Uint16Array(indices);
	return ret;
}