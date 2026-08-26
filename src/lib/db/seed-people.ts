import type { Role } from "@/types";

export interface UserSeed {
  username: string;
  password: string;
  fullName: string;
  position: string;
  phone: string;
  role: Role;
}

/**
 * Стартовые учётные записи. Пароли демонстрационные — при передаче системы
 * заказчику их нужно сменить в разделе «Сотрудники».
 */
export const USERS_SEED: UserSeed[] = [
  {
    username: "admin",
    password: "admin123",
    fullName: "Игорь Соколов",
    position: "Начальник склада",
    phone: "+998 (90) 234-56-01",
    role: "ADMIN",
  },
  {
    username: "volkov",
    password: "sklad123",
    fullName: "Дмитрий Волков",
    position: "Старший кладовщик",
    phone: "+998 (90) 234-56-02",
    role: "WAREHOUSE_WORKER",
  },
  {
    username: "kovalev",
    password: "sklad123",
    fullName: "Артём Ковалёв",
    position: "Кладовщик",
    phone: "+998 (90) 234-56-03",
    role: "WAREHOUSE_WORKER",
  },
  {
    username: "petrov",
    password: "sklad123",
    fullName: "Максим Петров",
    position: "Кладовщик",
    phone: "+998 (90) 234-56-04",
    role: "WAREHOUSE_WORKER",
  },
  {
    username: "orlov",
    password: "sklad123",
    fullName: "Виктор Орлов",
    position: "Учётчик склада",
    phone: "+998 (90) 234-56-08",
    role: "WAREHOUSE_WORKER",
  },
];

export const ORGANIZATIONS_SEED = [
  {
    name: "Gagarin Avenue",
    address: "Samarqand sh., Gagarin ko'chasi, 12",
    inn: "305412876",
    phone: "+998 (66) 233-40-10",
  },
];

export const SUPPLIERS_SEED = [
  { name: "ELECTRO", contact: "Далер", phone: "+998 (93) 344-00-40", inn: "302114765" },
  { name: "SHTUKATUROF MCHJ", contact: "Отдел продаж", phone: "+998 (66) 210-55-18", inn: "306721904" },
  { name: "SMZ DEMIR PROFIL", contact: "Бахтиеров Фаезжон", phone: "+998 (66) 231-77-02", inn: "301998432" },
  { name: "SAM WOODMAX TRADE MCHJ", contact: "Отдел снабжения", phone: "+998 (66) 240-13-90", inn: "308445127" },
  { name: "OSIYO KABEL SAVDO SAMARKAND MCHJ", contact: "Склад", phone: "+998 (66) 227-31-45", inn: "304556218" },
  { name: "NASIMIY SOF CEMENT MCHJ", contact: "Отдел продаж", phone: "+998 (66) 219-08-77", inn: "307113650" },
  { name: "LIDER METALL DIZAYN MCHJ", contact: "Менеджер", phone: "+998 (66) 244-62-01", inn: "305998741" },
  { name: "MASTER MEGA PROFIL MCHJ", contact: "Отдел снабжения", phone: "+998 (66) 235-19-26", inn: "309223805" },
];

export interface BlockSeed {
  name: string;
  description: string;
  sortOrder: number;
}

/**
 * Блоки стройки A–E. Порядок задаётся явно: в списке они должны идти
 * как на площадке, а не по алфавиту базы.
 */
export const BLOCKS_SEED: BlockSeed[] = [
  { name: "A", description: "Блок A", sortOrder: 0 },
  { name: "B", description: "Блок B", sortOrder: 1 },
  { name: "C", description: "Блок C", sortOrder: 2 },
  { name: "D", description: "Блок D", sortOrder: 3 },
  { name: "E", description: "Блок E", sortOrder: 4 },
];
