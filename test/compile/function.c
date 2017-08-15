struct A { int b; };

static struct A* calc() {
  return (struct A*)0;
}

double fn(float f, int i) {
  return 0;
}

int main(int argc, char** argv) {
  int c = fn(1, 2.0L);
  int d = pow(c, sqrt(M_PI));
  return c;
}
