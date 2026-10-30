import {facelets} from './engine.mjs';
const palette={U:'#f1f4f7',D:'#f4d448',F:'#239e63',B:'#3779d6',L:'#ef8e37',R:'#d44b47',X:'#15131c'};
const order=['F','R','U','B','L','D'];
export function cube3D(state,{yaw=-35,pitch=-27,size=174,colors=null}={}){
 const sides=facelets(state);
 const faces=order.map(face=>'<div class="cube3d-face cube3d-'+face+'">'+sides[face].map(color=>'<span class="cube3d-tile" style="background:'+(colors?.[color]||palette[color])+'"></span>').join('')+'</div>').join('');
 return '<div class="cube3d-stage" role="img" aria-label="Cubo tridimensional mostrando o estado atual"><div class="cube3d-scene" style="--cube-size:'+size+'px;--cube-half:'+(size/2)+'px;--yaw:'+yaw+'deg;--pitch:'+pitch+'deg"><div class="cube3d-object">'+faces+'</div></div></div>';
}
