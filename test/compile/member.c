struct C {
  float c1;
};

struct B {
  char b1[10];
  struct C c;
  struct C cc[5];
  int b2;
  void* b4;
  double b3;
};

int main() {
  char* a = (char*) 0x1000;
  struct B* b = (struct B*) 0x2000;
  b->b1[b->cc[3].c1];
  int d = b->b2;
  int e = b->b3;
  return 0;
}
