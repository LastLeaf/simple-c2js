int main() {
  unsigned int a = 1;
  int b = 0x1234 << 2;
  a = a >> 1 >> 0;
  a = b >> a;
  return a;
}
