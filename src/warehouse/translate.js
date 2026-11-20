const words={
 'GKE Da Nang':['GKE Đà Nẵng','GKE 岘港'],'Out of Stock':['Hết hàng','缺货'],'Maintenance':['Đang bảo trì','维护中'],'Closed':['Đã đóng','已关闭'],
 'Search sites, trucks, forklifts, pallets, shipments…':['Tìm kho, xe, pallet, vận đơn…','搜索仓库、车辆、托盘、货件…'],
 'Operations simulation':['Mô phỏng vận hành','运营模拟'],'Network overview':['Toàn mạng lưới','仓库网络总览'],
 'Stock on hand':['Tồn kho','当前库存'],'Trucks on site':['Xe tại kho','在库车辆'],'On-time delivery':['Giao đúng hạn','准时交付率'],
 'Live':['Mô phỏng','模拟'],'Operational':['Đang hoạt động','运营中'],'Inventory':['Hàng tồn kho','库存'],
 'Forklift fleet':['Đội xe nâng','叉车车队'],'Shipment Tracking':['Theo dõi vận đơn','货件追踪'],
 'Shipment tracking':['Theo dõi vận đơn','货件追踪'],'Docks':['Cửa kho','月台'],'Forklifts':['Xe nâng','叉车'],'Trucks':['Xe tải','卡车'],
 'Order Confirmed':['Xác nhận đơn','订单已确认'],'Picked':['Đã lấy hàng','已拣货'],'Loading':['Đang bốc hàng','装货中'],
 'Unloading':['Đang dỡ hàng','卸货中'],'In Transit':['Đang vận chuyển','运输中'],'Delivered':['Đã giao','已送达'],
 'In Stock':['Còn hàng','有库存'],'Low Stock':['Sắp hết','库存不足'],'Available':['Sẵn sàng','可用'],'En route':['Đang đến','途中'],
 'Charging':['Đang sạc','充电中'],'Idle':['Đang chờ','空闲'],'Outbound today':['Hôm nay xuất kho','今日出库'],
 'Put-aways today':['Hôm nay nhập kệ','今日上架'],'Stock on hand':['Tồn kho','当前库存'],'Truck bays':['Cửa đỗ xe','卡车月台'],
 'Cardboard Box (M)':['Thùng carton (M)','纸箱（中号）'],'Plastic Container':['Thùng nhựa','塑料箱'],
 'Safety Helmet':['Mũ bảo hộ','安全帽'],'Packing Tape':['Băng keo đóng gói','包装胶带'],
 'LED Panel 60×60':['Đèn LED 60×60','LED 灯板 60×60'],'Office Chair':['Ghế văn phòng','办公椅'],
 'Nitrile Gloves':['Găng tay nitrile','丁腈手套'],'Frozen Peas 10 kg':['Đậu đông lạnh 10 kg','冷冻豌豆 10 kg'],
 'Spring Water 24-pack':['Nước uống 24 chai','矿泉水 24 瓶'],
 'GKE Hoang Mai':['GKE Hoàng Mai','GKE 黄梅'],'GKE Dong Anh':['GKE Đông Anh','GKE 东英'],
 'GKE Ho Chi Minh':['GKE Hồ Chí Minh','GKE 胡志明市'],'Operations Manager':['Quản lý vận hành','运营经理'],
 'Notifications':['Thông báo','通知'],'Search':['Tìm kiếm','搜索'],'Close':['Đóng','关闭'],'Driver':['Tài xế','司机'],
 'Carrier':['Hãng vận chuyển','承运商'],'Status':['Trạng thái','状态'],'Battery':['Pin','电量'],
 'Focus':['Đưa vào giữa','定位'],'Follow':['Theo dõi','跟随'],'Site':['Kho','仓库'],'Destination':['Điểm đến','目的地'],
 'Inbound':['Nhập kho','入库'],'Outbound':['Xuất kho','出库'],'units':['đơn vị','件'],'Loading dock':['Cửa nhập','收货月台'],
 'Waiting for work':['Chờ công việc','等待任务'],'DEPOT':['KHO','仓库'],'DISTRIBUTION CENTER':['TRUNG TÂM PHÂN PHỐI','配送中心'],'COLD STORE':['KHO LẠNH','冷库']
};
export function localizeWarehouse(root){
 const locale=document.documentElement.lang;if(locale==='en')return;
 const index=locale==='vi'?0:1;
 const translate=value=>{const trimmed=value.trim();const result=words[trimmed]?.[index];if(result)return value.replace(trimmed,result);
 const dynamic={vi:{'last 30 days':'30 ngày gần đây','docked':'xe đã vào bến','arriving':'xe đang đến','staged':'pallet chờ','inbound':'đang đến','full':'sức chứa','busy':'đang dùng','working':'đang hoạt động','trucks':'xe','pallets':'pallet'},zh:{'last 30 days':'最近30天','docked':'已停靠','arriving':'正在到达','staged':'待处理','inbound':'入站','full':'容量','busy':'使用中','working':'运行中','trucks':'车辆','pallets':'托盘'}}[locale];
 let text=value;for(const [word,replacement]of Object.entries(dynamic))text=text.replace(new RegExp('\\b'+word+'\\b','g'),replacement);return text;};
 const walk=node=>{
  if(node.nodeType===Node.TEXT_NODE){const old=node.nodeValue;const next=translate(old);if(next!==old)node.nodeValue=next;return;}
  if(node.nodeType!==Node.ELEMENT_NODE || ['SCRIPT','STYLE'].includes(node.tagName))return;
  for(const attr of ['placeholder','title','aria-label'])if(node.hasAttribute(attr)){const old=node.getAttribute(attr);const next=translate(old);if(next!==old)node.setAttribute(attr,next);}
  for(const child of node.childNodes)walk(child);
 };
 const observer=new MutationObserver(records=>{observer.disconnect();for(const record of records){if(record.type==='characterData')walk(record.target);else if(record.type==='attributes')walk(record.target);else for(const node of record.addedNodes)walk(node);}observe();});
 const observe=()=>observer.observe(root,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['placeholder','title','aria-label']});
 walk(root);observe();window.addEventListener('pagehide',()=>observer.disconnect(),{once:true});
}
