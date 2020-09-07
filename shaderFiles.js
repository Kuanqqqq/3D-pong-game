    
// Vertex shader 1
var vertex_shader1 =
`	attribute  vec3 vPosition;
	attribute  vec3 vNormal;
	uniform    vec4 inColor;
	varying    vec4 outColor;
	uniform    mat4 uMVMatrix;
	uniform    mat4 uNormalMatrix;
	uniform    mat4 uProjMatrix;
	varying	   vec4 lightVector;
	varying	   vec4 normal;

	void main()
	{
		gl_Position = uProjMatrix * uMVMatrix * vec4(vPosition,1.0);
		vec4 p = uMVMatrix * vec4(vPosition,1.0);
		normal = normalize(uNormalMatrix * vec4(vNormal, 0.0));
		outColor = inColor;
		lightVector = -p;
		lightVector.w = 0.0;
		lightVector = normalize(lightVector);
	}`;


// fragment shader 1
var fragment_shader1 =
`	precision mediump float;
	varying  vec4 outColor;
	varying	   vec4 lightVector;
	varying	   vec4 normal;
	uniform    float specular_coeff;

	void main()
	{
		float diffuse = dot(lightVector, normal);
		if (diffuse < 0.3)
			diffuse = 0.3;
		gl_FragColor = outColor * abs(diffuse) + specular_coeff * pow(normal.z,20.0);
		gl_FragColor.w = 1.0;
		
	}`;
    
	