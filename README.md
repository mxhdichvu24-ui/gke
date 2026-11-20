# GKE Logistics

Website Anh–Việt–Trung cho dịch vụ vận chuyển Việt Nam đi Mỹ và Anh. Trang chủ giữ bố cục và tài sản của landing page hiện hành. Mục GKE 3D mở cảnh mô phỏng trên cùng website.

## Chạy và kiểm thử

Yêu cầu Node.js 22.12 trở lên.

```sh
npm ci
npm run check
npm run build
GKE_DEMO_RATES=1 npm run dev
```

| English | Tiếng Việt | 中文 |
|---|---|---|
| `/` | `/vi` | `/zh` |
| `/services` | `/vi/dich-vu` | `/zh/services` |
| `/shipping-calculator` | `/vi/bao-gia` | `/zh/shipping-calculator` |
| `/gke-3d` | `/vi/gke-3d` | `/zh/gke-3d` |
| `/tracking` | `/vi/tra-cuu` | `/zh/tracking` |
| `/contact` | `/vi/lien-he` | `/zh/contact` |

- `content/landing.html` chứa cấu trúc trang chủ và giao diện dùng chung. `content/vi.json` chứa bản dịch VI. `scripts/pages.mjs` tạo HTML cho 12 trang khi build.
- Trang chủ giữ các khối và ảnh gốc. Ô điện thoại của biểu mẫu cũ được đổi thành điểm đến. Nút tính cước chuyển số đo sang trang báo giá, với cân nặng hiển thị bằng kg. Các ảnh nhận diện được bàn giao nằm trong `public/brand`, còn logo đang hiển thị là ảnh của landing page gốc. Video giới thiệu gốc được mã hóa lại để giảm dung lượng.
- GKE 3D tải riêng. Mã nguồn cảnh gốc do chủ dự án cung cấp được ghi nhận tại `docs/WARETRACK-ORIGINAL.md`; các mô hình thương hiệu được bổ sung trong `public/gke3d/models`.

## Vercel Preview

1. Kết nối repo `mxhdichvu24-ui/gke` với project Vercel dành riêng cho GKE. Chọn Vite, thư mục gốc repo, lệnh `npm run build`, thư mục đầu ra `dist`.
2. Đặt `GKE_DEMO_RATES=1` cho Preview. Môi trường Production luôn vô hiệu hóa bảng mô phỏng. Giữ `GKE_INDEXING=0` ở Preview. Chỉ đặt `SITE_URL` và bật `GKE_INDEXING=1` cho domain chính thức đã duyệt.
3. Kiểm tra cả 12 đường dẫn. Xác minh `POST /api/shipping-estimates` trên Preview trả **520.000 VND** cho Economy, 2 kg, 40 × 30 × 20 cm. Kiểm tra trang chủ không tải Three.js và đường dẫn Track mở được trên thiết bị thật.
4. Kiểm tra các điểm tương tác, đổi Mỹ/Anh khi cảnh đang phát, ảnh tĩnh, chế độ giảm chuyển động, zoom, Safari iPhone và Chrome Android. Ghi tên thiết bị, mạng và FPS.
5. Nếu cần quay lui, chọn deployment đã qua nghiệm thu trước đó trong Vercel và redeploy hoặc khôi phục alias trong đúng môi trường. Giữ bản sao cơ sở dữ liệu trước thay đổi migration có dữ liệu thật.

## Supabase và tư vấn

Chạy migration trong `supabase/migrations` trên project Supabase mới đã xác minh cho GKE. Gửi thử bằng dữ liệu giả. RPC `accept_gke_quote` tạo mã tham chiếu khi giao dịch lưu thành công, gộp retry theo khóa và giới hạn lượt gửi. Vai trò công khai không thể đọc hay gọi RPC. Chỉ bật `GKE_QUOTE_INTAKE=1` sau khi xác nhận người nhận, cách người nhận theo dõi bản ghi, quyền truy cập, lịch xoá dữ liệu và nội dung quyền riêng tư. Cấu hình `SUPABASE_URL`, `SUPABASE_SECRET_KEY` và `GKE_RATE_LIMIT_SECRET` ở server. Xem `.env.example` cho tên biến. Khi dịch vụ chưa bật, website dẫn khách tới kênh liên hệ.

Chưa có bảng giá hoặc API giá thương mại và các ca kiểm thử được GKE duyệt. Bộ tính cước sẽ trả trạng thái cần tư vấn khi dữ liệu giá chưa có. Tracking trong phiên bản này mở cổng GKE Track.

## Kết quả kiểm tra cục bộ

- TypeScript, 11 test API, hãng vận chuyển, dữ liệu và cước và build Vite chạy thành công.
- 19 trang gồm EN/VI/ZH và admin trả HTTP 200. API trả đúng cước mô phỏng và trả 503 có hướng dẫn khi chưa kết nối nơi tiếp nhận.
- Trình duyệt Codex giữ 2 / 40 / 30 / 20 khi chuyển từ landing page sang báo giá, hiển thị giá mẫu và giữ số đo cùng gói khi chuyển VI → EN.
- GLB tải được bằng GLTFLoader. HTML trang chủ không tham chiếu module Three.js. JS/CSS, GLB và ảnh của cảnh 3D vào khoảng 286 kB ở mức gzip.
- Đo WebGL và FPS trên thiết bị thật, duyệt bản dịch và tài sản, Vercel Preview và tích hợp Supabase thật còn chờ nghiệm thu.


## Admin và phiên bản ngày 20/11

Tiếng Anh mặc định ở `/`, tiếng Việt ở `/vi`, tiếng Trung ở `/zh`. Các đường dẫn báo giá lần lượt `/shipping-calculator`, `/vi/bao-gia`, `/zh/shipping-calculator`. GKE 3D mở tại `/gke-3d`, `/vi/gke-3d`, `/zh/gke-3d`. Các URL cũ được chuyển hướng và giữ tham số địa điểm.

Trang `/admin` hỗ trợ đăng nhập, xem tổng số yêu cầu, tìm và lọc khách liên hệ, ghi chú, đổi trạng thái và xuất CSV/JSON. Nội dung giới thiệu, số điện thoại, email và các thống kê công khai có thể chỉnh tại Website content. Cập nhật đồng thời được kiểm soát bằng revision. Bộ kiểm thử xác minh phiên đăng nhập, chặn truy cập chưa đăng nhập, chống trùng yêu cầu và xuất CSV an toàn. Chạy `npm run dev` cho bản local có API và file lưu riêng tại `.gke-local/data.json`, được bỏ qua bởi Git. Tài khoản cục bộ được cấu hình theo yêu cầu chủ dự án. Production cần đặt hash mật khẩu và khóa phiên qua biến môi trường server. Không gửi các khóa server xuống trình duyệt.

Cảnh 3D sử dụng mã từ repo WareTrack do chủ dự án cung cấp, đổi nhận diện GKE và còn đúng ba kho Hoàng Mai, Đông Anh, Hồ Chí Minh. Tài sản van và kiện hàng ở `public/gke3d/models` được dùng trong thế giới 3D, với hãng theo tuyến: US gồm USPS, UniUni, FedEx và SpeedX; UK gồm Evri và Royal Mail. Logo SpeedX lấy từ speedx.io, Royal Mail từ postoffice.co.uk; decal dùng vật liệu không phụ thuộc ánh sáng để giữ màu rõ. Bản này là mô hình low-poly. Độ chi tiết bề mặt và hình dáng van cần tiếp tục đối chiếu ảnh tham chiếu. Chuyển ngôn ngữ trong 3D đã dịch các nhóm chính, một số câu thông tin sinh động còn tiếng Anh. Mục Dữ liệu GKE 3D trong admin cho phép nhập sức chứa, tồn kho, xe, cửa bến, xe nâng, tỷ lệ đúng hạn và danh sách SKU cho từng địa điểm. Chế độ công bố dùng số liệu đã lưu, dừng cập nhật số ngẫu nhiên và ẩn danh sách hoạt động, tracking mẫu. Chuyển động xe vẫn là mô phỏng. Số liệu được kiểm tra tổng, lưu có revision và xuất JSON. Chưa kết nối WMS/GPS tự động.

Migration `20261120180000_gke_admin.sql` bổ sung nơi lưu cấu hình, ghi chú khách liên hệ và RPC. Chưa xác minh migration trên project Supabase thật. Khi triển khai, chạy các migration tuần tự và kiểm tra RLS, vai trò service, gửi thử, đăng nhập và xuất file. Không áp migration vào dự án khác của người dùng.

Bảng giá thương mại và quy tắc cước GKE chưa được bàn giao. Các test trọng lượng dùng dữ liệu giả, gồm hệ số 5000 và 6000, nấc 0,5 kg, 5,000/5,001 kg, làm tròn kích thước và nhiều kiện. Kết quả thương mại chỉ được bật sau khi khớp bộ ca đã được GKE duyệt.

## Giao diện quản trị

Admin hỗ trợ English / Tiếng Việt từ bộ chọn góc trên bên phải, ghi nhớ ngôn ngữ trên trình duyệt và giữ dữ liệu biểu mẫu đang nhập khi đổi ngôn ngữ. Menu, bộ lọc, trạng thái, nhãn thông tin và thông báo đều có bản dịch. Logo chữ xanh đậm được đặt trên nền trắng; bố cục quản trị có sidebar, thẻ thống kê và tab riêng cho ba địa điểm GKE. Đã kiểm tra bố cục desktop và màn hình 390px.
