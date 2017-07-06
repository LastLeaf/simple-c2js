struct S {
  int s;
};

int main() {
  int a = 1;
  int b = a * 2 / 3 + 4.0L - 5;
  int c = a % b;
  double d = b + 6 - 7.0;
  float e = d * b;
  struct S* g = (struct S*)0x1000;
  g = g + 8 * d;
  return d * 9 / e;
}
