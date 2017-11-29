
   // 检测浏览器是否支持webgl
        if (!Detector.webgl) {
            Detector.addGetWebGLMessage();
            document.getElementById('container').innerHTML = '';
        }

        Physijs.scripts.worker = './libs/physijs_worker.js';
       

        // 全局变量
        // 绘图相关变量
        var container, stats, projector;
        var camera, controls, scene, renderer;
        var textureLoader;
        var pusher, coinBorn
        var clock = new THREE.Clock();

        init();
        animate();

        // -函数定义
        function init() {
            initGraphics();
            // initPhysics();
            createObjects();
            initInput();
            initPusher();
            initCoinBorn();
        }

        function initGraphics() {
            projector = new THREE.Projector;
            container = document.getElementById('container');
            container.innerHTML = '';

            camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 2000);
            camera.position.set(0, 40, 60);

            controls = new THREE.OrbitControls(camera);
            // controls.autoRotate = true;

            renderer = new THREE.WebGLRenderer({
                antialias: true
            });
            renderer.setClearColor(0xbfd1e5);
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.shadowMapEnabled = true;

            // 场景
            scene = new Physijs.Scene();
            scene.setGravity(new THREE.Vector3(0, -100, 0));

            // 参考坐标系
            var axis = new THREE.AxisHelper(50);
            scene.add(axis);

            var ambiColor = "#939ee3";
            var ambientLight = new THREE.AmbientLight(ambiColor);
            scene.add(ambientLight);

            var pointColor = "#00ff00";
            var directionalLight = new THREE.DirectionalLight(pointColor);
            directionalLight.position.set(-40, 60, -10);
            directionalLight.castShadow = true;
            directionalLight.shadowCameraNear = 2;
            directionalLight.shadowCameraFar = 200;
            directionalLight.shadowCameraLeft = -50;
            directionalLight.shadowCameraRight = 50;
            directionalLight.shadowCameraTop = 50;
            directionalLight.shadowCameraBottom = -50;
            directionalLight.distance = 0;
            directionalLight.intensity = 0.5;
            directionalLight.shadowMapHeight = 1024;
            directionalLight.shadowMapWidth = 1024;
            scene.add(directionalLight);

            container.appendChild(renderer.domElement);

            // 显示帧数
            stats = new Stats();
            stats.domElement.style.position = 'absolute';
            stats.domElement.style.top = '5px';
            stats.domElement.style.left = '0';
            container.appendChild(stats.domElement);

            // 添加窗口大小变化监听
            window.addEventListener('resize', onWindowResize, false);
        }

        function onWindowResize() {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }

        function animate() {
            requestAnimationFrame(animate);
            render();
            stats.update();
        }

        function render() {
            var deltaTime = clock.getDelta();
            controls.update(deltaTime);

            TWEEN.update();

            if (TWEEN.update()) {
                TWEEN.update(deltaTime);
            }

            renderer.render(scene, camera);

            scene.simulate(undefined, 1)

            camera.fov = calcFov(100, 100, window.innerWidth / window.innerHeight);
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
        }

        function createObjects() {

            // 创建地面
            var ground = new Physijs.BoxMesh(
                new THREE.CubeGeometry(65, 2, 60),
                Physijs.createMaterial(
                    new THREE.MeshPhongMaterial({
                        color: 0x0000ff
                    }),
                    .1, // friction 摩擦系数
                    .6 // restitution 材质弹性
                ),
                0
            )

            // 背后墙壁
            var wall = new Physijs.BoxMesh(
                new THREE.CubeGeometry(65, 60, 1),
                Physijs.createMaterial(
                    new THREE.MeshLambertMaterial({
                        color: 0xff0000
                    }),
                    .4, .3),
                0
            )
            wall.position = new THREE.Vector3(0, 20, -29.5)

            ground.add(wall)

            // 金币出生点
            coinBorn = new THREE.Mesh(
                new THREE.CubeGeometry(10, 5, 10),
                new THREE.MeshBasicMaterial({
                    color: 0xffff00,
                    wireframe: true
                })
            )
            coinBorn.position = new THREE.Vector3(0, 55, -20)

            ground.add(coinBorn)

            // 左障碍物
            var leftGeom = new THREE.CubeGeometry(30, 30, 20)
                // 形成斜面
            leftGeom.vertices[0] = new THREE.Vector3(15, 5, 10)
            leftGeom.vertices[1] = new THREE.Vector3(15, 5, -10)
            leftGeom.computeFaceNormals()
            leftGeom.computeVertexNormals()
            var leftWall = new Physijs.BoxMesh(
                leftGeom,
                Physijs.createMaterial(new THREE.MeshPhongMaterial({
                    color: 0xeeeeee
                }), .9, .3),
                0
            )
            leftWall.position = new THREE.Vector3(-40, 16, -20)

            // 右障碍物
            var rightGeom = new THREE.CubeGeometry(30, 30, 20)
                // 形成斜面
            rightGeom.vertices[4] = new THREE.Vector3(-15, 5, -10)
            rightGeom.vertices[5] = new THREE.Vector3(-15, 5, 10)
            rightGeom.computeFaceNormals()
            rightGeom.computeVertexNormals()

            var rightWall = new Physijs.BoxMesh(
                rightGeom,
                Physijs.createMaterial(new THREE.MeshPhongMaterial({
                    color: 0xff0000
                }), .1, .3),
                0
            )
            rightWall.position = new THREE.Vector3(40, 16, -20)

            ground.add(leftWall)
            ground.add(rightWall)

            // 创建推板
            pusher = new Physijs.BoxMesh(
                new THREE.CubeGeometry(50, 3, 60),
                Physijs.createMaterial(new THREE.MeshPhongMaterial({
                    color: 0xffff00
                }), 1, 9),
               0
            )
            pusher.position = new THREE.Vector3(5, 3, -60)

            ground.add(pusher)
            scene.add(ground)
        }

        var position;
        var tween, tweenBack;

        function initPusher() {
            position = {
                x: 0,
                y: 1,
                z: -60
            };
            tween = new TWEEN.Tween(position)
                .to({
                    x: 0,
                    y: 1,
                    z: -30
                }, 2000)
                .easing(TWEEN.Easing.Linear.None)
                .onUpdate(update);

            tweenBack = new TWEEN.Tween(position)
                .to({
                    x: 0,
                    y: 1,
                    z: -60
                }, 2000)
                .easing(TWEEN.Easing.Linear.None)
                .onUpdate(update);

            tween.chain(tweenBack);
            tweenBack.chain(tween);

            tween.start();
        }

        var position1;
        var tween1, tweenBack1;

        function initCoinBorn() {
            position1 = {
                x: -15,
                y: 45,
                z: -20
            };
            tween1 = new TWEEN.Tween(position1)
                .to({
                    x: 15,
                    y: 45,
                    z: -20
                }, 5000)
                .easing(TWEEN.Easing.Linear.None)
                .onUpdate(update1);

            tweenBack1 = new TWEEN.Tween(position1)
                .to({
                    x: -15,
                    y: 45,
                    z: -20
                }, 5000)
                .easing(TWEEN.Easing.Linear.None)
                .onUpdate(update1);

            tween1.chain(tweenBack1);
            tweenBack1.chain(tween1);

            tween1.start();
        }

        function update() {
            pusher.position.copy(position)
        }

        function update1() {
            coinBorn.position.copy(position1)
        }

        function initInput() {
            window.addEventListener('click', function() {
                var coin = new Physijs.CylinderMesh(
                    new THREE.CylinderGeometry(3, 3, 1, 10),
                    Physijs.createMaterial(
                        new THREE.MeshLambertMaterial({
                            color: 0x00ff00
                        }),
                        .3, // 高摩擦
                        .9 // 中弹性
                    ),
                    10
                );

                coin.position = new THREE.Vector3(position1.x, 38, -20)

                scene.add(coin)
            }, false);
        }

        function calcFov(d, w, r) {
            let f;
            let vertical = w;
            if (r < 1) {
                vertical = vertical / r;
            }
            f = Math.atan(vertical / d / 2) * 2 * (180 / Math.PI);
            return f;
        }
