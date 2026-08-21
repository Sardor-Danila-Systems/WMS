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
    phone: "+7 (901) 234-56-01",
    role: "ADMIN",
  },
  {
    username: "volkov",
    password: "sklad123",
    fullName: "Дмитрий Волков",
    position: "Старший кладовщик",
    phone: "+7 (901) 234-56-02",
    role: "WAREHOUSE_WORKER",
  },
  {
    username: "kovalev",
    password: "sklad123",
    fullName: "Артём Ковалёв",
    position: "Кладовщик",
    phone: "+7 (901) 234-56-03",
    role: "WAREHOUSE_WORKER",
  },
  {
    username: "petrov",
    password: "sklad123",
    fullName: "Максим Петров",
    position: "Кладовщик",
    phone: "+7 (901) 234-56-04",
    role: "WAREHOUSE_WORKER",
  },
  {
    username: "orlov",
    password: "sklad123",
    fullName: "Виктор Орлов",
    position: "Учётчик склада",
    phone: "+7 (901) 234-56-08",
    role: "WAREHOUSE_WORKER",
  },
];

export const PROJECTS_SEED = [
  { name: "ЖК «Северный парк», корпус 3", address: "г. Москва, ул. Дмитровская, 45" },
  { name: "ЖК «Речная гавань», корпус 1", address: "г. Москва, Речной проезд, 12" },
  { name: "Логистический центр «Восток»", address: "Московская обл., г. Балашиха, Промзона 4" },
  { name: "Школа №142, реконструкция", address: "г. Москва, ул. Полярная, 8" },
  { name: "Бизнес-центр «Меридиан»", address: "г. Москва, Ленинградское ш., 71" },
];

export const SUPPLIERS_SEED = [
  { name: "ООО «СтройИнвестПоставка»", contact: "+7 (495) 212-40-11" },
  { name: "ТД «Металлопрокат Урал»", contact: "+7 (343) 350-22-87" },
  { name: "ООО «КарьерСнаб»", contact: "+7 (495) 640-15-30" },
  { name: "ЗАО «ЛакКрасПром»", contact: "+7 (812) 320-77-14" },
  { name: "ООО «ГипсПрофСервис»", contact: "+7 (495) 980-63-22" },
  { name: "ТД «ЛесПромТорг»", contact: "+7 (812) 445-91-08" },
  { name: "ООО «ИзолТехСтрой»", contact: "+7 (495) 771-05-40" },
  { name: "ТК «КрепёжОпт»", contact: "+7 (495) 500-18-63" },
];

export interface ForemanSeed {
  name: string;
  phone: string;
  brigade: string;
  /** Индекс объекта в PROJECTS_SEED. */
  projectIndex: number;
}

export const FOREMEN_SEED: ForemanSeed[] = [
  { name: "Александр Быков", phone: "+7 (902) 345-67-01", brigade: "Бригада №1 (монолит)", projectIndex: 0 },
  { name: "Евгений Титов", phone: "+7 (902) 345-67-02", brigade: "Бригада №2 (кладка)", projectIndex: 0 },
  { name: "Владимир Гусев", phone: "+7 (902) 345-67-03", brigade: "Бригада №3 (монолит)", projectIndex: 1 },
  { name: "Андрей Смирнов", phone: "+7 (902) 345-67-04", brigade: "Бригада №4 (кладка)", projectIndex: 1 },
  { name: "Олег Фёдоров", phone: "+7 (902) 345-67-05", brigade: "Бригада №5 (фасад)", projectIndex: 2 },
  { name: "Денис Егоров", phone: "+7 (902) 345-67-06", brigade: "Бригада №6 (отделка)", projectIndex: 3 },
  { name: "Константин Никитин", phone: "+7 (902) 345-67-07", brigade: "Бригада №7 (кровля)", projectIndex: 2 },
  { name: "Руслан Абрамов", phone: "+7 (902) 345-67-08", brigade: "Бригада №8 (инженерные сети)", projectIndex: 4 },
];
