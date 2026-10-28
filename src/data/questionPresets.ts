import type { PollQuestion } from "../types/poll";

export const TRUYEN_GIANG_PRESET: PollQuestion[] = [
  {
    id: "q1",
    title:
      "Nếu một ngày AI và công nghệ có thể thay thế mọi công việc của con người, theo bạn, điều gì sẽ thay đổi sâu sắc nhất trong cuộc sống chúng ta?",
    options: [
      { id: "A", text: "Tiện nghi hơn nhưng chưa chắc hạnh phúc." },
      { id: "B", text: "Phải nhìn lại giá trị của bản thân." },
      { id: "C", text: "Tự do tận hưởng, không lo mưu sinh." },
      { id: "D", text: "Mất động lực phấn đấu và cống hiến." },
    ],
  },
  {
    id: "q2",
    title:
      "Theo bạn, tiền bạc thực sự đóng vai trò như thế nào trong việc mang lại hạnh phúc cho con người?",
    options: [
      { id: "A", text: "Tiền đem lại đủ đầy, chưa chắc bình an." },
      {
        id: "B",
        text: "Hạnh phúc nằm ở điều ta trân trọng, không phải tiền bạc.",
      },
      { id: "C", text: "Có tiền là được sống như mong muốn." },
      {
        id: "D",
        text: "Tiền chưa chắc mang lại hạnh phúc, nhưng thiếu tiền dễ áp lực.",
      },
    ],
  },
  {
    id: "q3",
    title:
      'Câu 3 .TÌNH YÊU VÀ CÁC MỐI QUAN HỆ: Đâu sẽ là nền tảng quyết định để hai người đi cùng nhau "sau này": Sự ổn định về tài chính - sự nghiệp hay sự chân thành của tình yêu?',
    options: [],
  },
  {
    id: "q4",
    title:
      "Một người 28 tuổi có nhà, có xe, thu nhập 50 triệu/tháng nhưng luôn bận rộn. Một người khác thu nhập đủ sống, chưa có nhà nhưng bình an và có thời gian cho gia đình. Theo bạn, ai mới là người thành công hơn?",
    options: [],
  },
  {
    id: "q5",
    title:
      "Câu 5 .GIỚI HẠN CỦA CON NGƯỜI: Điều gì khoa học chưa thể chứng minh thì chúng ta không nên tin. Bạn đồng ý hay không đồng ý với ý kiến này?.",
    options: [],
  },
  {
    id: "q6",
    title:
      "Câu 6: Một cuộc đời trọn vẹn là khi đạt được tất cả mục tiêu mình mong muốn, hay là khi biết hài lòng với những gì mình đang có?",
    options: [],
  },
  {
    id: "q7",
    title: "Câu 7: Nếu chỉ còn 24 giờ để sống, bạn chọn ưu tiên làm việc gì?",
    options: [],
  },
  {
    id: "q8",
    title:
      "Câu 9: Nếu con người có tất cả: tiền bạc, sức khỏe, công nghệ và tình yêu, liệu họ đã có một cuộc đời trọn vẹn chưa?",
    options: [],
  },
];

/**
 * Question IDs grouped for auto-loop slideshow on the stage (critical-thinking questions)
 */
export const AUTO_LOOP_QUESTION_IDS: string[] = ["q3", "q4", "q5"];
