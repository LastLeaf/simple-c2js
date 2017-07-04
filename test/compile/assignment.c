struct A {
  int a1;
  float a2;
};

int main() {
  struct A* a = (struct A*)0x1000;
  a->a2 = 1;
  int b = a->a2;
  a->a1 = b;
  return a->a1;
}
