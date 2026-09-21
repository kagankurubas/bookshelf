// public/favicon.svg ile ayni kaynaktan (bkz. oradaki yorum: potrace ile
// vektorize edilmis bookshelf motifi) - path verisi elle degil, o dosyadan
// kopyalanarak senkron tutuluyor. Ikisi ayri dosyalar oldugu icin (biri
// statik PWA/favicon asset'i, digeri React bileseni) tek bir kaynaktan
// otomatik paylasilmiyor - favicon.svg degisirse burasi da elle guncellenmeli.
export const BookLogoIcon = ({ light = false }) => (
  <svg width="36" height="36" viewBox="0 0 1350 1350" fill="none">
    <g transform="translate(177, 280.5)">
      <path d="M 310 1.1 C 295.9 3.9, 283.2 15.4, 278.6 29.5 C 277.1 34.1, 277 61.4, 277.2 351 L 277.5 667.5 280.2 672 C 283.7 678, 287.5 681.4, 293.5 684.2 L 298.5 686.4 388.9 686.2 L 479.4 686.1 484.7 683.5 C 490.6 680.6, 496 674.9, 498.1 669.3 C 499.8 664.6, 500.8 43.6, 499 34.3 C 496.1 18.2, 482.6 4.7, 466.2 1.1 C 459.8 -0.2, 317 -0.3, 310 1.1 M 90.7 106.4 C 79.8 110.3, 72 117.3, 66.7 127.9 L 63.5 134.5 63.2 399.5 C 63 600.4, 63.2 665.5, 64.1 668.8 C 65.7 674.7, 72.7 682.2, 79 684.9 L 84 687.1 163.8 686.8 C 234.3 686.5, 243.9 686.3, 247 684.9 C 252.4 682.4, 256.3 678.7, 259 673.4 L 261.5 668.5 261.8 403 C 262 160, 261.9 137.1, 260.4 132.5 C 257.3 123, 251.5 115.5, 243 110 C 233.8 104.1, 232.9 104, 162 104 L 97.5 104 90.7 106.4 M 542.7 123.1 C 533.1 125.4, 523.8 132.8, 518.8 142.2 L 516.5 146.5 516.2 405.4 C 516.1 581.4, 516.3 665.5, 517 668.1 C 518.6 673.9, 523.8 680.1, 529.9 683.2 L 535.2 686 605.9 686 L 676.6 686 681.8 683.4 C 684.7 682, 688.4 679.2, 690 677.2 C 696.5 669.4, 696 688.9, 695.8 405.5 L 695.5 147.5 692.8 141.9 C 689 134.3, 683.9 129.3, 676.1 125.6 L 669.5 122.5 608 122.3 C 574.2 122.2, 544.8 122.6, 542.7 123.1 M 818.5 144 C 797.2 150.1, 772.9 156.9, 759.5 160.5 C 729.3 168.6, 724.8 170.2, 718.6 175 C 706.9 183.9, 703.1 196.1, 706.3 214 C 707.6 221.4, 727.9 321.7, 752.5 443 C 778.3 570.3, 793.5 645.4, 796.1 658.3 C 800.3 679.8, 805.1 687.3, 817.7 692 C 826.2 695.2, 833.2 694.6, 881.5 686.5 C 955.9 674.1, 959.6 673.4, 962.7 671.2 C 970.3 665.7, 974 659.2, 974 651.3 C 974 647.1, 965 601.2, 953.5 546.5 C 951.6 537.2, 948.2 520.7, 946 510 C 935.1 456, 923.3 398.5, 916 363.5 C 905.9 314.8, 895.1 262.3, 885.5 215 C 876.2 168.7, 875.6 166, 872.5 160 C 862.9 141.1, 846 136.2, 818.5 144 M 330.5 177.4 C 326.8 181.1, 326.9 178.1, 327.2 324.2 L 327.5 461.9 329.8 464.2 L 332.1 466.5 388.5 466.5 L 444.9 466.5 447.2 464.2 L 449.5 461.9 449.5 321 L 449.5 180.1 447.2 177.8 L 444.9 175.5 389 175.2 L 333 175 330.5 177.4 M 92.6 201.6 C 90.2 203.9, 90.2 252.1, 92.6 254.4 C 95 256.8, 231.1 256.8, 233.1 254.4 C 235.3 251.7, 235.8 205.8, 233.6 202.5 L 232 200 163 200 C 101.7 200, 94 200.2, 92.6 201.6 M 851.9 210.4 C 851.5 210.8, 822.8 218.6, 798 225 C 753.2 236.6, 739.8 240.5, 738.9 242.2 C 738 243.8, 742 266.4, 746.3 283.5 C 748 290.5, 750.2 290.5, 775.5 283.6 C 791.7 279.2, 818.9 271.9, 864.3 259.8 C 867 259, 868.2 258.1, 868.6 256.3 C 869.7 252.1, 861.1 212.3, 858.8 210.9 C 857.5 210, 852.7 209.7, 851.9 210.4 M 544 221 C 541.1 224, 540.9 267.7, 543.8 270.3 C 546.4 272.7, 664.4 272.9, 667.6 270.6 C 670.3 268.6, 670.3 223.9, 667.6 221.1 C 664.7 218.3, 546.9 218.1, 544 221 M 546.4 300.8 C 542.3 301.5, 542 303.4, 542 326.7 C 542 347.8, 542.1 349.1, 544 351 C 547 354, 664.7 353.7, 667.7 350.7 C 670.4 348.1, 670.4 305, 667.8 302.4 C 666.2 300.8, 554.8 299.4, 546.4 300.8 M 919.5 566.1 C 916 567.1, 893.9 573.1, 868 580 C 857.8 582.7, 843 586.6, 835 588.8 C 827 591, 819.2 593.1, 817.5 593.4 C 813 594.5, 810 596.8, 810 599.3 C 810 602.1, 817.9 639, 818.9 641 C 820.4 643.8, 825.7 643.1, 846.1 637.5 C 857.3 634.4, 873.9 629.9, 883 627.5 C 919.8 617.7, 936.3 613, 937.7 611.8 C 939.6 610.3, 939.2 607, 934.1 584.1 C 929.6 564, 929 563.2, 919.5 566.1 M 92.6 580.6 C 90 583.1, 90.2 629, 92.8 631.3 C 95.4 633.7, 229.4 633.9, 232.6 631.6 C 234.9 629.9, 235.2 583.2, 232.9 580.4 C 231.1 578.2, 94.8 578.3, 92.6 580.6 M 22 699.3 C 12.4 701.9, 3.5 710.8, 0.9 720.3 C -1.2 728.3, 0.2 766.9, 2.8 771.7 C 6 777.7, 11.4 782.8, 17.9 785.9 L 23.5 788.5 498 788.5 L 972.5 788.5 978.1 785.9 C 993.3 778.7, 997 770.3, 997 742 C 997 730.5, 996.6 721, 996.2 721 C 995.7 721, 994.8 719.1, 994.1 716.9 C 992.5 711.7, 985.3 704.3, 978.5 701 L 973.5 698.5 500 698.3 C 130.3 698.2, 25.5 698.4, 22 699.3" fill={light ? '#fff' : '#3ECF8E'} fillRule="evenodd" />
    </g>
  </svg>
);

export const GridTabIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="8" height="8" rx="1.5" /><rect x="13" y="3" width="8" height="8" rx="1.5" />
    <rect x="3" y="13" width="8" height="8" rx="1.5" /><rect x="13" y="13" width="8" height="8" rx="1.5" />
  </svg>
);

export const TableTabIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M9 9v11" />
  </svg>
);

export const ShelfTabIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 4v16M20 4v16M4 12h16" />
  </svg>
);

export const DashboardTabIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 19V5a2 2 0 0 1 2-2h11l3 3v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" /><path d="M8 12h8M8 16h5" />
  </svg>
);

export const CompassIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="12" r="9" /><path d="M15 9l-2 6-6 2 2-6z" />
  </svg>
);

export const StarIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 3l2.6 5.9 6.4.6-4.8 4.3 1.5 6.3L12 17l-5.7 3.1 1.5-6.3-4.8-4.3 6.4-.6z" />
  </svg>
);

export const PlusIcon = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M12 5v14M5 12h14" /></svg>
);

export const TrashIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0-.8 12.1a2 2 0 0 1-2 1.9H9.8a2 2 0 0 1-2-1.9L7 7" />
  </svg>
);

export const ChevronDownIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><path d="M6 9l6 6 6-6" /></svg>
);

export const LibraryChipIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);

export const BarcodeChoiceIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 5v14M8 5v14M12 5v14M13.5 5v14M17 5v14M20 5v14" /></svg>
);

export const SearchChoiceIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
);

export const StackChoiceIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3l9 5-9 5-9-5 9-5z" /><path d="M3 13l9 5 9-5" /></svg>
);

export const PencilChoiceIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
);

export const SettingsIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3.2" />
    <path d="M19.4 13.5a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V19.5a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.04-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.04H4.5a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.56-1.04 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H10.5a1.7 1.7 0 0 0 1.04-1.56V4.5a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.04 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V10.5a1.7 1.7 0 0 0 1.56 1.04H19.5a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.56 1.04z" />
  </svg>
);

export const MoveHandleIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="8" cy="6" r="2" /><circle cx="16" cy="6" r="2" />
    <circle cx="8" cy="12" r="2" /><circle cx="16" cy="12" r="2" />
    <circle cx="8" cy="18" r="2" /><circle cx="16" cy="18" r="2" />
  </svg>
);

export const SparkleIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.8 5.6L19 9l-5.2 1.9L12 16l-1.8-5.1L5 9l5.2-1.4z" /></svg>
);

export const ShareIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
    <path d="M8.6 10.5l6.8-3.9M8.6 13.5l6.8 3.9" />
  </svg>
);

export const DownloadIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 3v13m0 0l-4.5-4.5M12 16l4.5-4.5" /><path d="M4 19h16" />
  </svg>
);
