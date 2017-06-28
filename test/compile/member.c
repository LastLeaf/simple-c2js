struct C {
  float c1;
};

struct B {
  char b1[10];
  struct C c;
  struct C cc[5];
  int bInt;
  void* bb;
  double bBouble;
  float bFloat;
};

int main() {
  char* a = (char*) 0x1000;
  struct B* b = (struct B*) 0x2000;
  b->b1[b->cc[3].c1];
  int dInt = b->bInt;
  double dDouble = b->bInt;
  float dFloat = b->bInt;
  int eInt = b->bBouble;
  double eDouble = b->bBouble;
  float eFloat = b->bBouble;
  int fInt = b->bFloat;
  double fDouble = b->bFloat;
  float fFloat = b->bFloat;
  return 0;
}
